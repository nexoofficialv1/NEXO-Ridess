package com.astratechnologies.nexoride;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.location.Location;
import android.location.LocationManager;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

public class MainActivity extends Activity {
    private static final String HOST = "ride.nexoofficial.in";
    private static final String BASE_URL = "https://" + HOST + "/app/?v=apk7l&native=1";
    private static final String PREFS = "nexo_ride_native_prefs";
    private static final int REQ_PERMISSIONS = 7001;
    private static final int REQ_FILE_CHOOSER = 7002;

    private WebView webView;
    private ProgressBar progressBar;
    private ValueCallback<Uri[]> filePathCallback;
    private Uri cameraPhotoUri;
    private GeolocationPermissions.Callback geoCallback;
    private String geoOrigin;
    private PermissionRequest webPermissionRequest;
    private SharedPreferences prefs;

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        ensureNativeDeviceId();

        FrameLayout root = new FrameLayout(this);
        webView = new WebView(this);
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setVisibility(View.GONE);

        root.addView(webView, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        root.addView(progressBar, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, 8));
        setContentView(root);

        configureWebView();
        requestNeededPermissions(false);

        Uri deep = getIntent() != null ? getIntent().getData() : null;
        String startUrl = urlFromDeepLink(deep);
        webView.loadUrl(startUrl != null ? startUrl : BASE_URL);
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private void configureWebView() {
        WebView.setWebContentsDebuggingEnabled(false);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);

        String ua = s.getUserAgentString();
        if (ua == null) ua = "";
        if (!ua.contains("NEXO-Ride-Android")) {
            s.setUserAgentString(ua + " NEXO-Ride-Android/7J");
        }

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) cookies.setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new NativeBridge(this), "NexoRideNative");
        webView.setWebViewClient(new NexoWebViewClient());
        webView.setWebChromeClient(new NexoChromeClient());
    }

    private class NexoWebViewClient extends WebViewClient {
        @Override public void onPageStarted(WebView view, String url, Bitmap favicon) { progressBar.setVisibility(View.VISIBLE); super.onPageStarted(view, url, favicon); }
        @Override public void onPageFinished(WebView view, String url) { progressBar.setVisibility(View.GONE); injectNativeReady(); super.onPageFinished(view, url); }
        @Override public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) { return handleUrl(request.getUrl()); }
        @Override public boolean shouldOverrideUrlLoading(WebView view, String url) { return handleUrl(Uri.parse(url)); }
    }

    private boolean handleUrl(Uri uri) {
        if (uri == null) return false;
        String url = uri.toString();
        String scheme = lower(uri.getScheme());
        String host = lower(uri.getHost());
        String path = uri.getPath() == null ? "" : uri.getPath();

        if ("nexoride".equals(scheme)) {
            String deepUrl = urlFromDeepLink(uri);
            if (deepUrl != null) webView.loadUrl(deepUrl);
            return true;
        }

        if (HOST.equals(host) && path.contains("/api/auth/google/start")) {
            openExternal(ensureQueryParam(uri, "app", "1").toString());
            return true;
        }

        if (host.contains("accounts.google.com") || host.contains("oauth2.googleapis.com") || host.contains("googleusercontent.com")) {
            openExternal(url);
            return true;
        }

        if (("http".equals(scheme) || "https".equals(scheme)) && HOST.equals(host)) return false;

        if ("tel".equals(scheme) || "mailto".equals(scheme) || url.contains("google.com/maps") || url.contains("mappls.com")) {
            openExternal(url);
            return true;
        }

        if (!"http".equals(scheme) && !"https".equals(scheme)) {
            openExternal(url);
            return true;
        }
        Toast.makeText(this, "External link blocked for safety", Toast.LENGTH_SHORT).show();
        return true;
    }

    private String urlFromDeepLink(Uri uri) {
        if (uri == null) return null;
        String scheme = lower(uri.getScheme());
        String host = lower(uri.getHost());
        String path = uri.getPath() == null ? "" : uri.getPath();

        if ("https".equals(scheme) && HOST.equals(host)) {
            if (path.startsWith("/app-return")) return buildInternal("/app/", uri, true);
            if (path.startsWith("/app") || path.startsWith("/qr") || path.startsWith("/qr-scanner") || path.startsWith("/guest-ride") || path.startsWith("/driver-lite")) return uri.toString();
        }

        if (!"nexoride".equals(scheme)) return null;
        if ("qr".equals(host)) return buildInternal("/qr-scanner/", uri, true);
        if ("book".equals(host)) return buildInternal("/qr/", uri, true);
        if ("driver".equals(host)) return buildInternal("/driver-lite/", uri, true);
        if ("guest-ride".equals(host)) return buildInternal("/guest-ride/", uri, true);
        if ("auth".equals(host) && path.startsWith("/google")) return buildInternal("/app/", uri, true);
        return buildInternal("/app/", uri, true);
    }

    private String buildInternal(String path, Uri source, boolean nativeFlag) {
        Uri.Builder b = Uri.parse("https://" + HOST + path).buildUpon();
        for (String name : source.getQueryParameterNames()) {
            String val = source.getQueryParameter(name);
            if (val != null) b.appendQueryParameter(name, val);
        }
        if (nativeFlag) b.appendQueryParameter("native", "1");
        b.appendQueryParameter("native_return", "1");
        return b.build().toString();
    }

    private String lower(String v) { return v == null ? "" : v.toLowerCase(Locale.ROOT); }
    private Uri ensureQueryParam(Uri uri, String key, String value) { return uri.getQueryParameter(key) != null ? uri : uri.buildUpon().appendQueryParameter(key, value).build(); }
    private void openExternal(String url) { try { Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url)); i.addCategory(Intent.CATEGORY_BROWSABLE); startActivity(i); } catch (ActivityNotFoundException ex) { Toast.makeText(this, "No app found to open this link", Toast.LENGTH_SHORT).show(); } }

    private class NexoChromeClient extends WebChromeClient {
        @Override public void onProgressChanged(WebView view, int newProgress) { progressBar.setProgress(newProgress); progressBar.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE); }
        @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) { geoOrigin = origin; geoCallback = callback; if (hasLocationPermission()) callback.invoke(origin, true, false); else requestNeededPermissions(true); }
        @Override public void onPermissionRequest(PermissionRequest request) { webPermissionRequest = request; runOnUiThread(() -> { if (hasCameraPermission() && hasLocationPermission()) { try { request.grant(request.getResources()); } catch (Exception ignored) {} } else requestNeededPermissions(true); }); }
        @Override public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (MainActivity.this.filePathCallback != null) MainActivity.this.filePathCallback.onReceiveValue(null);
            MainActivity.this.filePathCallback = callback;
            Intent contentIntent = new Intent(Intent.ACTION_GET_CONTENT);
            contentIntent.addCategory(Intent.CATEGORY_OPENABLE);
            contentIntent.setType("*/*");
            contentIntent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/*", "application/pdf"});
            contentIntent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            Intent cameraIntent = null;
            if (hasCameraPermission()) {
                try {
                    File photoFile = createImageFile();
                    cameraPhotoUri = FileProvider.getUriForFile(MainActivity.this, "com.astratechnologies.nexoride.fileprovider", photoFile);
                    cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraPhotoUri);
                    cameraIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                } catch (Exception ignored) { cameraIntent = null; }
            }
            Intent chooser = new Intent(Intent.ACTION_CHOOSER);
            chooser.putExtra(Intent.EXTRA_INTENT, contentIntent);
            chooser.putExtra(Intent.EXTRA_TITLE, "KYC Document / Photo select করুন");
            if (cameraIntent != null) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{cameraIntent});
            try { startActivityForResult(chooser, REQ_FILE_CHOOSER); } catch (ActivityNotFoundException e) { MainActivity.this.filePathCallback = null; Toast.makeText(MainActivity.this, "File chooser not available", Toast.LENGTH_SHORT).show(); return false; }
            return true;
        }
    }

    private File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        return File.createTempFile("NEXO_KYC_" + timeStamp + "_", ".jpg", storageDir);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_FILE_CHOOSER) {
            Uri[] results = null;
            if (resultCode == RESULT_OK) {
                if (data == null || data.getData() == null) { if (cameraPhotoUri != null) results = new Uri[]{cameraPhotoUri}; }
                else if (data.getClipData() != null) { int count = data.getClipData().getItemCount(); results = new Uri[count]; for (int i = 0; i < count; i++) results[i] = data.getClipData().getItemAt(i).getUri(); }
                else results = new Uri[]{data.getData()};
            }
            if (filePathCallback != null) filePathCallback.onReceiveValue(results);
            filePathCallback = null; cameraPhotoUri = null;
        }
    }

    private boolean hasLocationPermission() { return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED; }
    private boolean hasCameraPermission() { return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED; }

    private void requestNeededPermissions(boolean force) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        List<String> perms = new ArrayList<>();
        if (!hasLocationPermission()) { perms.add(Manifest.permission.ACCESS_FINE_LOCATION); perms.add(Manifest.permission.ACCESS_COARSE_LOCATION); }
        if (!hasCameraPermission()) perms.add(Manifest.permission.CAMERA);
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) perms.add(Manifest.permission.POST_NOTIFICATIONS);
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) perms.add(Manifest.permission.READ_MEDIA_IMAGES);
            if (checkSelfPermission(Manifest.permission.READ_MEDIA_VIDEO) != PackageManager.PERMISSION_GRANTED) perms.add(Manifest.permission.READ_MEDIA_VIDEO);
        } else if (checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) perms.add(Manifest.permission.READ_EXTERNAL_STORAGE);
        if (!perms.isEmpty()) requestPermissions(perms.toArray(new String[0]), REQ_PERMISSIONS); else if (force) Toast.makeText(this, "All permissions already allowed", Toast.LENGTH_SHORT).show();
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQ_PERMISSIONS) return;
        boolean loc = hasLocationPermission();
        if (geoCallback != null && geoOrigin != null) { geoCallback.invoke(geoOrigin, loc, false); geoCallback = null; geoOrigin = null; }
        if (webPermissionRequest != null && hasCameraPermission()) { try { webPermissionRequest.grant(webPermissionRequest.getResources()); } catch (Exception ignored) {} webPermissionRequest = null; }
        Toast.makeText(this, loc ? "Location permission ready" : "Location permission not allowed", Toast.LENGTH_SHORT).show();
    }

    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); String deepUrl = urlFromDeepLink(intent != null ? intent.getData() : null); if (deepUrl != null && webView != null) webView.loadUrl(deepUrl); }
    @Override public void onBackPressed() { if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed(); }

    private String ensureNativeDeviceId() {
        String id = prefs.getString("native_device_id", "");
        if (id == null || id.length() < 12) { id = "apk_" + UUID.randomUUID().toString().replace("-", ""); prefs.edit().putString("native_device_id", id).apply(); }
        return id;
    }

    private String jsEscape(String v) { return v == null ? "" : v.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ").replace("\r", " "); }
    private void injectNativeReady() {
        try { webView.evaluateJavascript("window.NEXO_NATIVE_READY=true;window.dispatchEvent(new CustomEvent('nexo-native-ready',{detail:{deviceId:'" + jsEscape(ensureNativeDeviceId()) + "',version:'2.0.7L'}}));", null); } catch (Exception ignored) {}
    }

    public class NativeBridge {
        private final Context context;
        NativeBridge(Context ctx) { context = ctx; }
        @JavascriptInterface public void openAppSettings() { runOnUiThread(() -> { Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS); i.setData(Uri.parse("package:" + getPackageName())); startActivity(i); }); }
        @JavascriptInterface public void requestAllPermissions() { runOnUiThread(() -> requestNeededPermissions(true)); }
        @JavascriptInterface public String isNativeApp() { return "true"; }
        @JavascriptInterface public String version() { return "2.0.7L-NATIVE"; }
        @JavascriptInterface public String getDeviceId() { return ensureNativeDeviceId(); }
        @JavascriptInterface public String getDeviceInfoJson() { return "{\"device_id\":\"" + ensureNativeDeviceId() + "\",\"platform\":\"ANDROID_APK\",\"device_name\":\"" + Build.MANUFACTURER + " " + Build.MODEL + "\",\"app_version\":\"2.0.7L\"}"; }
        @JavascriptInterface public String getLastLocationJson() {
            if (!hasLocationPermission()) return "{}";
            try {
                LocationManager lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
                Location best = null;
                for (String p : lm.getProviders(true)) {
                    Location l = lm.getLastKnownLocation(p);
                    if (l != null && (best == null || l.getTime() > best.getTime())) best = l;
                }
                if (best == null) return "{}";
                return "{\"lat\":" + best.getLatitude() + ",\"lng\":" + best.getLongitude() + ",\"accuracy\":" + best.getAccuracy() + ",\"source\":\"ANDROID_LAST_KNOWN\"}";
            } catch (Exception e) { return "{}"; }
        }
        @JavascriptInterface public String networkStatus() {
            try { ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE); NetworkInfo n = cm == null ? null : cm.getActiveNetworkInfo(); return n != null && n.isConnected() ? "ONLINE" : "OFFLINE"; } catch (Exception e) { return "UNKNOWN"; }
        }
        @JavascriptInterface public void openQRScanner() { runOnUiThread(() -> webView.loadUrl("https://" + HOST + "/qr-scanner/?native=1")); }
        @JavascriptInterface public void openBookRide() { runOnUiThread(() -> webView.loadUrl("https://" + HOST + "/qr/?native=1")); }
        @JavascriptInterface public void openDriverDashboard() { runOnUiThread(() -> webView.loadUrl("https://" + HOST + "/driver-lite/?native=1")); }
        @JavascriptInterface public void openGuestRide(String token) { runOnUiThread(() -> webView.loadUrl("https://" + HOST + "/guest-ride/?native=1&token=" + Uri.encode(token == null ? "" : token))); }
        @JavascriptInterface public void storeDriverRefreshToken(String refreshToken) { prefs.edit().putString("driver_refresh_token", refreshToken == null ? "" : refreshToken).apply(); }
        @JavascriptInterface public String getDriverRefreshToken() { return prefs.getString("driver_refresh_token", ""); }
        @JavascriptInterface public void clearDriverRefreshToken() { prefs.edit().remove("driver_refresh_token").apply(); }
    }
}
