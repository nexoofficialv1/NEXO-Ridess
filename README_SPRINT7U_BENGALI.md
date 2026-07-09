# NEXO Ride Sprint-7U

## Bengali/English UX + Distribution Pack

এই build Sprint-7T পর্যন্ত cumulative update ধরে Sprint-7U যোগ করেছে।

### নতুন জিনিস
- `/ux-polish/` Bengali/English UX readiness page
- `/distribution-pack/` APK distribution/permission guide
- `/api/platform/ux-distribution-readiness`
- `/api/public/language-pack`
- `/api/public/distribution-pack`
- Friendly error catalog
- APK version `2.0.7U`, versionCode `89`
- GitHub APK artifact `NEXO_Ride_APK_Sprint7U`

### Deploy Rule
- শুধু latest ZIP deploy করুন।
- live `.env` overwrite করবেন না।
- live `data/` folder overwrite করবেন না।
- deploy করার আগে server backup নিন।

### Check Commands
```bash
npm run s7u:check
```
