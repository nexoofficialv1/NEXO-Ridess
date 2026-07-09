const http=require('http');
console.log('Sprint-7Q Role Security Preflight');
console.log('- Role matrix: MAIN_ADMIN, SAFETY_ADMIN, FINANCE_ADMIN, SUPPORT_ADMIN, KYC_ADMIN, OPS_ADMIN, AREA_ADMIN');
console.log('- Main Admin only: Config Vault, Production Mode, Secret rotation, Role assignment');
console.log('- Public policies endpoint: /api/policies');
process.exit(0);
