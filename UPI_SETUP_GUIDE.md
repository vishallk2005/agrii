# 📱 UPI Payment Setup Guide for AgriDirect

## 🎯 Overview
This guide will help you configure your UPI ID to receive payments through Razorpay integration in your AgriDirect application.

---

## 📋 **Step 1: Get Your Razorpay Account**

### 1.1 Create Razorpay Account
1. Visit [Razorpay](https://razorpay.com/)
2. Click "Sign Up" → "Create Account"
3. Choose "Business Account" (recommended for receiving payments)
4. Fill in your business details:
   - Business name: "AgriDirect" (or your business name)
   - Business type: "E-commerce" or "Agriculture"
   - PAN card details
   - Bank account details

### 1.2 Complete KYC Process
- Upload required documents:
  - PAN card
  - Address proof
  - Bank account details
  - Business registration (if applicable)

---

## 🔑 **Step 2: Get API Keys**

### 2.1 Test Keys (for development)
1. Login to Razorpay Dashboard
2. Go to **Settings** → **API Keys**
3. You'll see **Test Mode** keys:
   - **Key ID**: `rzp_test_XXXXXXXXXXXXXX`
   - **Key Secret**: Copy and keep secure

### 2.2 Production Keys (for live payments)
1. Complete KYC verification
2. Switch to **Live Mode** in dashboard
3. Generate production keys
4. Store keys securely

---

## 💳 **Step 3: Configure UPI ID**

### 3.1 Link Your UPI ID to Razorpay
1. In Razorpay Dashboard, go to **Payment Methods**
2. Click **Configure UPI**
3. Add your UPI ID:
   - Format: `your-upi-id@bankname`
   - Examples: `9876543210@ybl`, `farmer@paytm`, `agri@okicici`

### 3.2 Supported UPI Apps
- Google Pay (GPay)
- PhonePe
- Paytm
- BHIM
- Bank UPI apps

---

## ⚙️ **Step 4: Update Configuration Files**

### 4.1 Frontend Configuration
Edit `frontend/script.js`:

```javascript
// ================= RAZORPAY CONFIG =================
const RAZORPAY_KEY_ID = 'rzp_test_YourActualKeyHere'; // Replace with your test key

// ================= UPI CONFIGURATION =================
const UPI_CONFIG = {
  // Your personal/business UPI ID
  upi_id: 'your-actual-upi-id@paytm', // Replace with your UPI ID
  
  // Business details
  merchant_name: 'AgriDirect',
  merchant_description: 'Agricultural Products Marketplace',
  
  // Contact information
  support_email: 'your-email@gmail.com',
  support_phone: '+919876543210', // Your actual phone
};
```

### 4.2 Backend Configuration
Edit `backend/server.js`:

```javascript
// Razorpay configuration
const RAZORPAY_KEY_ID = 'rzp_test_YourActualKeyHere'; // Same as frontend
const RAZORPAY_KEY_SECRET = 'YourActualSecretKeyHere'; // From Razorpay dashboard
```

---

## 🏦 **Step 5: Bank Account Setup**

### 5.1 Add Bank Account to Razorpay
1. Go to **Settings** → **Bank Accounts**
2. Add your business bank account:
   - Account holder name
   - Account number
   - IFSC code
   - Bank name
   - Account type (Current/Savings)

### 5.2 Settlement Settings
- Set settlement frequency (daily/weekly)
- Configure auto-settlement
- Set minimum settlement amount

---

## 🧪 **Step 6: Test Payment Integration**

### 6.1 Test Mode Testing
1. Use test credentials to make test payments
2. Test with small amounts (₹1-₹5)
3. Verify payment flow:
   - Cart → Checkout → Payment → Success

### 6.2 Test UPI Apps
- Test with different UPI apps
- Verify QR code generation
- Test payment callbacks

---

## 🚀 **Step 7: Go Live**

### 7.1 Switch to Production
1. Replace test keys with production keys
2. Update configuration in both frontend and backend
3. Test with real payments (small amounts)

### 7.2 Monitor Transactions
- Check Razorpay Dashboard
- Monitor payment success rates
- Set up email notifications

---

## 📞 **Popular UPI ID Formats**

### Bank-Specific UPI IDs:
- **Paytm**: `mobilenumber@paytm`
- **Google Pay**: `username@okaxis`, `username@okhdfcbank`
- **PhonePe**: `mobilenumber@ybl`
- **BHIM**: `username@upi`
- **ICICI**: `username@okicici`
- **HDFC**: `username@okhdfcbank`
- **SBI**: `username@oksbi`

### Example UPI IDs:
```
9876543210@paytm
agriproducts@okaxis
farmerdirect@ybl
agridirect@okicici
```

---

## 🔒 **Security Best Practices**

### 7.1 Keep Keys Secure
- Never commit API keys to Git
- Use environment variables in production
- Regularly rotate API keys

### 7.2 UPI Security
- Use business UPI ID (not personal)
- Enable two-factor authentication
- Monitor transaction alerts

---

## 🛠️ **Troubleshooting**

### Common Issues:
1. **Payment Failed**: Check API keys and UPI ID configuration
2. **UPI Not Working**: Verify UPI ID is linked to Razorpay
3. **KYC Issues**: Complete Razorpay KYC verification
4. **Bank Settlement**: Check bank account details

### Error Solutions:
- **Invalid Key ID**: Double-check Razorpay dashboard
- **UPI Timeout**: Check internet connection and UPI app
- **Payment Declined**: Verify sufficient balance in customer account

---

## 📞 **Support**

### Razorpay Support:
- Email: support@razorpay.com
- Phone: 022-6725-8888
- Help Center: [Razorpay Help](https://razorpay.com/docs/)

### UPI App Support:
- **Google Pay**: Contact Google support
- **PhonePe**: Contact PhonePe support
- **Paytm**: Contact Paytm support

---

## ✅ **Final Checklist**

Before going live, ensure:
- [ ] Razorpay account created and KYC completed
- [ ] API keys obtained and configured
- [ ] UPI ID linked to Razorpay
- [ ] Bank account added for settlements
- [ ] Test payments working successfully
- [ ] Production keys configured
- [ ] Error handling implemented
- [ ] Customer support details updated

---

## 🎉 **You're Ready!**

Once you complete these steps, your AgriDirect platform will be able to receive UPI payments from customers through Razorpay integration!

**Remember**: Start with test mode, verify everything works, then switch to production mode for real payments.
