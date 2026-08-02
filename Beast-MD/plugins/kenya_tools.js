// ── kenya_tools.js ────────────────────────────────────────────────────────
// Henry Ochibots — Kenya Community Tools Plugin
// Replaces cybercafe trips for Kenyan mothers, students, workers & farmers.
// All tools are REAL — calculations use official Kenya rates, status checks
// guide users to official portals step by step, document generators produce
// real downloadable content.
//
// h = { sock, from, msg, isOwner, isPrimaryOwner, isCoOwner, isSubAdmin,
//       isBotAdmin, isGroup, sender, senderJid, sessionId, senderNumber,
//       args, config, apiClient, logActivity }
// ─────────────────────────────────────────────────────────────────────────

module.exports = {};

// ── Shared helpers ────────────────────────────────────────────────────────

function reply(h, text) {
  return h.sock.sendMessage(h.from, { text }, { quoted: h.msg });
}

function missingArgs(h, usage) {
  return reply(h, `❌ Missing info.\n\n${usage}`);
}

// Typing indicator wrapper — shows "typing…" in WhatsApp while processing
async function withTyping(h, fn) {
  try {
    await h.sock.sendPresenceUpdate('composing', h.from);
  } catch (_) {}
  try {
    const result = await fn();
    return result;
  } finally {
    try {
      await h.sock.sendPresenceUpdate('paused', h.from);
    } catch (_) {}
  }
}

// Format currency in KES
function kes(amount) {
  return 'KES ' + Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── KENYA MENU ────────────────────────────────────────────────────────────

Object.assign(module.exports, {

  // .ke or .kenya — main menu
  "ke": async (h) => {
    await withTyping(h, () => reply(h,
`🇰🇪 *HENRY OCHIBOTS — KENYA TOOLS*
_Tuko Pamoja. No cyber needed._

━━━━━━━━━━━━━━━━━━━━━
💰 *MONEY CALCULATORS*
━━━━━━━━━━━━━━━━━━━━━
.paye <gross> — Net salary after tax
.nhif — NHIF/SHA contribution
.nssf <gross> — NSSF contribution
.helb <amount> <rate> <months> — Loan repayment
.loan <amount> <rate> <months> — Any loan calc
.mpesa_cost <amount> — M-Pesa send cost
.vat <amount> — VAT (16%) calculator
.stamp <price> — Stamp duty on property
.token <amount> — KPLC electricity tokens estimate
.fuel <litres> <price> — Fuel cost

━━━━━━━━━━━━━━━━━━━━━
🏛️ *GOVT STATUS CHECKS*
━━━━━━━━━━━━━━━━━━━━━
.voter <ID> — IEBC voter + polling station
.helb_status <ID> — HELB loan status
.kra <PIN> — KRA PIN/compliance guide
.ntsa <plate> — NTSA vehicle check guide
.nhif_status <ID> — NHIF/SHA status guide
.nssf_status <ID> — NSSF statement guide
.knec <index> — KNEC results guide
.kuccps <index> — KUCCPS placement guide

━━━━━━━━━━━━━━━━━━━━━
📄 *DOCUMENT GUIDES*
━━━━━━━━━━━━━━━━━━━━━
.id_replace — Lost/replace National ID
.passport — Passport application guide
.birth_cert — Birth certificate guide
.good_conduct — Police clearance guide
.business_reg — Business registration
.kra_pin — KRA PIN registration
.ecitizen — eCitizen account setup

━━━━━━━━━━━━━━━━━━━━━
📝 *DOCUMENT GENERATORS*
━━━━━━━━━━━━━━━━━━━━━
.cv <name> <job> <experience> — Basic CV
.cover <name> <company> <job> — Cover letter
.invoice <client> <items> <total> — Invoice
.payslip <name> <gross> — Payslip
.resign <name> <company> <date> — Resignation

━━━━━━━━━━━━━━━━━━━━━
🎓 *EDUCATION*
━━━━━━━━━━━━━━━━━━━━━
.kcse <subjects and grades> — Mean grade
.gpa <marks> — GPA calculator
.bursary — CDF bursary guide

━━━━━━━━━━━━━━━━━━━━━
🏥 *HEALTH & EMERGENCY*
━━━━━━━━━━━━━━━━━━━━━
.emergency — Emergency numbers by county
.hospitals — Hospital finder guide
.blood — Blood donation centers

━━━━━━━━━━━━━━━━━━━━━
🌾 *COMMUNITY*
━━━━━━━━━━━━━━━━━━━━━
.matatu <route> — Matatu fare guide
.huduma <county> — Huduma Centre guide
.jobs — Jobs board guide

Type any command above to get started! 💪
_Henry Ochibots — Tuko Pamoja_ 🇰🇪`
    ));
  },
  "kenya": async (h) => module.exports["ke"](h),
  "menu_ke": async (h) => module.exports["ke"](h),

});

// ── MONEY CALCULATORS ─────────────────────────────────────────────────────

Object.assign(module.exports, {

  // .paye <gross_monthly_salary>
  "paye": async (h) => {
    const gross = parseFloat(h.args[0]);
    if (!gross || gross <= 0) {
      return missingArgs(h, 'Usage: *.paye <monthly gross salary>*\nExample: .paye 50000');
    }

    await withTyping(h, async () => {
      // 2024 Kenya PAYE bands
      let taxable = gross;
      let tax = 0;

      // Band 1: 0 - 24,000 @ 10%
      if (taxable > 0) {
        const band = Math.min(taxable, 24000);
        tax += band * 0.10;
        taxable -= band;
      }
      // Band 2: 24,001 - 32,333 @ 25%
      if (taxable > 0) {
        const band = Math.min(taxable, 8333);
        tax += band * 0.25;
        taxable -= band;
      }
      // Band 3: Above 32,333 @ 30%
      if (taxable > 0) {
        tax += taxable * 0.30;
      }

      // Personal relief
      const personalRelief = 2400;
      tax = Math.max(0, tax - personalRelief);

      // NHIF/SHA (flat KES 500 for formal employment as of 2024 transition)
      const nhif = 500;

      // NSSF Tier I: 6% of gross up to KES 7,000 = max KES 420
      // NSSF Tier II: 6% of gross between 7,001-36,000 = max KES 1,740
      // Total employee max = KES 2,160
      let nssf = 0;
      if (gross <= 7000) {
        nssf = gross * 0.06;
      } else if (gross <= 36000) {
        nssf = 420 + (gross - 7000) * 0.06;
      } else {
        nssf = 2160; // capped
      }
      nssf = Math.round(nssf);

      const totalDeductions = tax + nhif + nssf;
      const netSalary = gross - totalDeductions;

      await reply(h,
`💰 *KENYA PAYE CALCULATOR*
━━━━━━━━━━━━━━━━━━━━━

📊 *Gross Salary:* ${kes(gross)}/month

*Deductions:*
├ PAYE Tax: ${kes(tax)}
├ NHIF/SHA: ${kes(nhif)}
└ NSSF: ${kes(nssf)}

💸 *Total Deductions: ${kes(totalDeductions)}*
✅ *NET SALARY: ${kes(netSalary)}/month*

📌 Based on KRA 2024 tax bands:
• 0-24k @ 10% | 24k-32.3k @ 25% | Above 32.3k @ 30%
• Personal relief: KES 2,400/month
• NHIF/SHA: KES 500 flat (2024)
• NSSF: New Act rates (max KES 2,160)

_Henry Ochibots 🇰🇪 — Tuko Pamoja_`
      );
    });
  },

  // .nhif — contribution table
  "nhif": async (h) => {
    const gross = parseFloat(h.args[0]);
    await withTyping(h, async () => {
      if (!gross) {
        return reply(h,
`🏥 *NHIF/SHA CONTRIBUTION 2024*
━━━━━━━━━━━━━━━━━━━━━

As of 2024, Kenya is transitioning from NHIF to SHA (Social Health Authority).

*Current rate for formal employees:*
✅ *KES 500/month* (flat rate)

*For self-employed/informal:*
• Register at SHA portal: shif.or.ke
• Monthly contribution based on income

*SHA Benefits:*
• Outpatient & inpatient coverage
• Maternity care
• Chronic illness management
• Emergency treatment

*To check your status:*
Type: *.nhif_status <your ID number>*

_Henry Ochibots 🇰🇪_`
        );
      }

      // Old NHIF bands (still used for reference)
      let contribution;
      if (gross <= 5999) contribution = 150;
      else if (gross <= 7999) contribution = 300;
      else if (gross <= 11999) contribution = 400;
      else if (gross <= 14999) contribution = 500;
      else if (gross <= 19999) contribution = 600;
      else if (gross <= 24999) contribution = 750;
      else if (gross <= 29999) contribution = 850;
      else if (gross <= 34999) contribution = 900;
      else if (gross <= 39999) contribution = 950;
      else if (gross <= 44999) contribution = 1000;
      else if (gross <= 49999) contribution = 1100;
      else if (gross <= 59999) contribution = 1200;
      else if (gross <= 69999) contribution = 1300;
      else if (gross <= 79999) contribution = 1400;
      else if (gross <= 89999) contribution = 1500;
      else if (gross <= 99999) contribution = 1600;
      else contribution = 1700;

      await reply(h,
`🏥 *NHIF/SHA CONTRIBUTION*
━━━━━━━━━━━━━━━━━━━━━

Gross Salary: ${kes(gross)}/month

*2024 SHA (current):*
✅ Flat rate: *KES 500/month*

*Old NHIF rate for reference:*
📌 Was: *KES ${contribution}/month*

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  // .nssf <gross>
  "nssf": async (h) => {
    const gross = parseFloat(h.args[0]);
    if (!gross || gross <= 0) {
      return missingArgs(h, 'Usage: *.nssf <monthly gross salary>*\nExample: .nssf 45000');
    }

    await withTyping(h, async () => {
      let employeeNSSF = 0;
      let employerNSSF = 0;

      // Tier I: 6% of first KES 7,000 (Lower Earnings Limit)
      const tier1 = Math.min(gross, 7000) * 0.06;
      // Tier II: 6% of earnings between 7,001 and 36,000 (Upper Earnings Limit)
      const tier2Base = Math.max(0, Math.min(gross, 36000) - 7000);
      const tier2 = tier2Base * 0.06;

      employeeNSSF = Math.round(tier1 + tier2);
      employerNSSF = employeeNSSF; // employer matches

      const totalNSSF = employeeNSSF + employerNSSF;

      await reply(h,
`🏦 *NSSF CONTRIBUTION (New Act)*
━━━━━━━━━━━━━━━━━━━━━

Gross Salary: ${kes(gross)}/month

*Tier I* (first KES 7,000 @ 6%):
├ Employee: ${kes(tier1)}
└ Employer: ${kes(tier1)}

*Tier II* (KES 7,001–36,000 @ 6%):
├ Employee: ${kes(tier2)}
└ Employer: ${kes(tier2)}

━━━━━━━━━━━━━━━━━━━━━
👤 *Your deduction: ${kes(employeeNSSF)}/month*
🏢 Employer pays: ${kes(employerNSSF)}/month
💰 Total to NSSF: ${kes(totalNSSF)}/month

Max employee contribution: KES 2,160/month

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  // .loan <amount> <annual_rate_%> <months>
  "loan": async (h) => {
    const [amount, rate, months] = h.args.map(parseFloat);
    if (!amount || !rate || !months) {
      return missingArgs(h,
        'Usage: *.loan <amount> <annual rate %> <months>*\nExample: .loan 200000 14 24'
      );
    }

    await withTyping(h, async () => {
      const monthlyRate = rate / 100 / 12;
      let monthlyPayment;

      if (monthlyRate === 0) {
        monthlyPayment = amount / months;
      } else {
        monthlyPayment = amount * monthlyRate * Math.pow(1 + monthlyRate, months)
          / (Math.pow(1 + monthlyRate, months) - 1);
      }

      const totalPayment = monthlyPayment * months;
      const totalInterest = totalPayment - amount;

      await reply(h,
`💳 *LOAN REPAYMENT CALCULATOR*
━━━━━━━━━━━━━━━━━━━━━

Loan Amount: ${kes(amount)}
Annual Rate: ${rate}%
Repayment Period: ${months} months

✅ *Monthly Payment: ${kes(monthlyPayment)}*

Total Repayment: ${kes(totalPayment)}
Total Interest: ${kes(totalInterest)}

💡 Tip: Always compare rates from:
• Your SACCO (usually lowest)
• M-Shwari/KCB M-Pesa
• Bank loans
• Fuliza (most expensive — short-term only!)

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  "helb": async (h) => module.exports["loan"](h),

  // .mpesa_cost <amount> — Safaricom M-Pesa send-money tariff calculator
  // NOTE: named .mpesa_cost, not .mpesa — .mpesa already exists in
  // ported_info.js (aliased to a generic mobile-money lookup command).
  // Using the same name would silently shadow it.
  "mpesa_cost": async (h) => {
    const amount = parseFloat(h.args[0]);
    if (!amount || amount <= 0) {
      return missingArgs(h, 'Usage: *.mpesa_cost <amount to send>*\nExample: .mpesa_cost 1500');
    }

    await withTyping(h, async () => {
      // Safaricom M-Pesa send money tariff (2024)
      // Send to registered M-Pesa user
      let cost;
      if (amount <= 49) cost = 0;
      else if (amount <= 100) cost = 0;
      else if (amount <= 500) cost = 7;
      else if (amount <= 1000) cost = 13;
      else if (amount <= 1500) cost = 23;
      else if (amount <= 2500) cost = 33;
      else if (amount <= 3500) cost = 53;
      else if (amount <= 5000) cost = 57;
      else if (amount <= 7500) cost = 78;
      else if (amount <= 10000) cost = 90;
      else if (amount <= 15000) cost = 100;
      else if (amount <= 20000) cost = 105;
      else if (amount <= 25000) cost = 108;
      else if (amount <= 30000) cost = 108;
      else if (amount <= 35000) cost = 108;
      else if (amount <= 40000) cost = 108;
      else if (amount <= 45000) cost = 108;
      else if (amount <= 50000) cost = 108;
      else if (amount <= 70000) cost = 108;
      else { cost = 'above limit'; }

      const costDisplay = typeof cost === 'number' ? kes(cost) : cost;
      const totalDisplay = typeof cost === 'number' ? kes(amount + cost) : 'N/A';

      await reply(h,
`📱 *M-PESA SEND MONEY COST*
━━━━━━━━━━━━━━━━━━━━━

Amount to Send: ${kes(amount)}
Transaction Fee: *${costDisplay}*
Total from your M-Pesa: *${totalDisplay}*

📌 This is for sending to a *registered M-Pesa user*.
Sending to unregistered or bank withdrawal has different rates.

💡 *Save fees tip:*
• Send in 1 transaction (not split)
• Use Lipa na M-Pesa (free for payments)
• Fuliza fee = 1% per day — avoid if possible

_Henry Ochibots 🇰🇪 — Safaricom 2024 tariff_`
      );
    });
  },

  // .vat <amount>
  "vat": async (h) => {
    const amount = parseFloat(h.args[0]);
    if (!amount || amount <= 0) {
      return missingArgs(h, 'Usage: *.vat <amount>*\nExample: .vat 5000');
    }

    await withTyping(h, async () => {
      const vatRate = 0.16;
      const vatAmount = amount * vatRate;
      const totalWithVat = amount + vatAmount;
      const priceExclVat = amount / (1 + vatRate);
      const vatOnIncluded = amount - priceExclVat;

      await reply(h,
`🧾 *VAT CALCULATOR (16%)*
━━━━━━━━━━━━━━━━━━━━━

*If KES ${amount.toLocaleString()} is price EXCLUDING VAT:*
VAT (16%): ${kes(vatAmount)}
Total with VAT: *${kes(totalWithVat)}*

*If KES ${amount.toLocaleString()} is price INCLUDING VAT:*
Price ex-VAT: ${kes(priceExclVat)}
VAT portion: *${kes(vatOnIncluded)}*

📌 Standard VAT rate in Kenya: 16%
📌 Some items are VAT-exempt or zero-rated

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  // .stamp <property_price>
  "stamp": async (h) => {
    const price = parseFloat(h.args[0]);
    if (!price || price <= 0) {
      return missingArgs(h, 'Usage: *.stamp <property price>*\nExample: .stamp 5000000');
    }

    await withTyping(h, async () => {
      // Kenya stamp duty rates 2024
      // Urban areas: 4% | Rural areas: 2%
      const urbanDuty = price * 0.04;
      const ruralDuty = price * 0.02;

      await reply(h,
`🏠 *STAMP DUTY CALCULATOR*
━━━━━━━━━━━━━━━━━━━━━

Property Value: ${kes(price)}

*Urban/City property (4%):*
Stamp Duty: *${kes(urbanDuty)}*

*Rural/Agricultural land (2%):*
Stamp Duty: *${kes(ruralDuty)}*

*Other costs to budget for:*
• Legal fees: ~1-2% of price
• Land rates clearance: varies by county
• Registration fees: ~KES 2,000-5,000
• Valuation fee: ~0.25% of value

📌 Paid to Kenya Revenue Authority (KRA)
via iTax before title deed transfer.

*Steps:*
1. Get property valued by govt valuer
2. Pay stamp duty on iTax
3. Lodge for title deed at Ardhisasa

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  // .token <ksh amount>
  "token": async (h) => {
    const amount = parseFloat(h.args[0]);
    if (!amount || amount <= 0) {
      return missingArgs(h, 'Usage: *.token <amount in KES>*\nExample: .token 500');
    }

    await withTyping(h, async () => {
      // KPLC token calculation (approximate - rates vary by category)
      // Domestic tariff 2024 (approximate)
      // Fixed charge: KES 200/month approx
      // Energy charge: varies by consumption
      // This is an estimate — actual tokens depend on meter category

      const fixedCharge = 200; // approximate monthly fixed
      const vatRate = 0.16;
      const fuelCostLevy = 0.05; // approximate
      const reaClevy = 0.02; // approximate

      const netForUnits = amount / (1 + vatRate + fuelCostLevy + reaClevy);
      // Domestic tariff: ~KES 12-19/unit depending on consumption
      const unitRate = 15; // approximate average
      const estimatedUnits = (netForUnits) / unitRate;

      await reply(h,
`⚡ *KPLC TOKEN ESTIMATOR*
━━━━━━━━━━━━━━━━━━━━━

Amount: ${kes(amount)}

Estimated units: *~${estimatedUnits.toFixed(1)} kWh*
(at ~KES ${unitRate}/unit average domestic rate)

📌 *Note:* This is an estimate only.
Actual units depend on:
• Your meter category (domestic/commercial)
• Current KPLC fuel cost levy
• REA levy and VAT components

*To get exact token:*
Buy via:
• M-Pesa → Lipa na M-Pesa → 888880
• KPLC portal: kplc.co.ke
• Safaricom app

*To check your account:*
SMS your meter number to 95551

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  // .fuel <litres> <price_per_litre>
  "fuel": async (h) => {
    const litres = parseFloat(h.args[0]);
    const pricePerLitre = parseFloat(h.args[1]);
    if (!litres || !pricePerLitre) {
      return missingArgs(h,
        'Usage: *.fuel <litres> <price per litre>*\nExample: .fuel 40 195\n\nOr: *.fuel <KES budget> <price per litre>* for how many litres you can get'
      );
    }

    await withTyping(h, async () => {
      const totalCost = litres * pricePerLitre;
      const litresFor1000 = 1000 / pricePerLitre;

      await reply(h,
`⛽ *FUEL COST CALCULATOR*
━━━━━━━━━━━━━━━━━━━━━

Litres: ${litres}L
Price/Litre: ${kes(pricePerLitre)}

*Total Cost: ${kes(totalCost)}*

With KES 1,000 you get: ~${litresFor1000.toFixed(1)}L

📌 Current pump prices (check EPRA):
• Super Petrol: varies by region
• Diesel: varies by region
• Kerosene: varies by region

Check latest at: epra.go.ke

_Henry Ochibots 🇰🇪_`
      );
    });
  },

});

// ── GOVERNMENT STATUS CHECKERS ────────────────────────────────────────────

Object.assign(module.exports, {

  // .voter <ID number>
  "voter": async (h) => {
    const id = h.args[0];
    if (!id) {
      return missingArgs(h, 'Usage: *.voter <National ID number>*\nExample: .voter 12345678');
    }

    await withTyping(h, async () => {
      // Real IEBC portal lookup guide
      await reply(h,
`🗳️ *IEBC VOTER STATUS CHECK*
━━━━━━━━━━━━━━━━━━━━━

Checking ID: *${id}*

*How to check your voter status:*

📱 *Option 1 — SMS (fastest):*
SMS your ID number to *70000*
You'll get your polling station back instantly.

🌐 *Option 2 — Online:*
1. Go to: *checkregistration.iebc.or.ke*
2. Enter your ID: ${id}
3. Enter your date of birth
4. Click "Check Status"
5. Your polling station will appear
6. Download/screenshot the result

📞 *Option 3 — Call:*
IEBC Helpline: *0800 724 000* (free)

*What you'll see:*
✅ Your name
✅ Registration county & constituency
✅ Polling station name & code
✅ Serial number on register

📌 If not found: Visit nearest IEBC office
with your original National ID card.

_Henry Ochibots 🇰🇪 — Tuko Pamoja_`
      );
    });
  },

  // .kra <PIN>
  "kra": async (h) => {
    const pin = h.args[0] ? h.args[0].toUpperCase() : null;
    if (!pin) {
      return missingArgs(h, 'Usage: *.kra <KRA PIN>*\nExample: .kra A001234567T');
    }

    await withTyping(h, async () => {
      await reply(h,
`🏛️ *KRA PIN & COMPLIANCE CHECK*
━━━━━━━━━━━━━━━━━━━━━

PIN: *${pin}*

*To check your tax compliance:*

🌐 *KRA iTax Portal:*
1. Go to: *itax.kra.go.ke*
2. Click "PIN Checker" (top menu)
3. Enter PIN: ${pin}
4. Complete the captcha
5. Click Submit

*To download Tax Compliance Certificate:*
1. Log in to iTax
2. Certificates → Tax Compliance
3. Apply for certificate
4. Download PDF (valid 12 months)

📱 *File Nil Returns (if no income):*
1. iTax → File Returns → Income Tax
2. Select "Nil Return"
3. Submit — takes 2 minutes

📞 *KRA Help:*
• Call: *0711 099 999*
• Email: callcentre@kra.go.ke
• Visit: Nearest KRA office

⚠️ *File by June 30* each year to avoid penalties!

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  // .ntsa <plate_number>
  "ntsa": async (h) => {
    const plate = h.args[0] ? h.args[0].toUpperCase() : null;
    if (!plate) {
      return missingArgs(h, 'Usage: *.ntsa <plate number>*\nExample: .ntsa KDC 123A');
    }

    await withTyping(h, async () => {
      await reply(h,
`🚗 *NTSA VEHICLE CHECK*
━━━━━━━━━━━━━━━━━━━━━

Plate: *${plate}*

*Check vehicle details on NTSA TIMS:*

🌐 *Online:*
1. Go to: *tims.ntsa.go.ke*
2. Click "Verify Vehicle"
3. Enter plate: ${plate}
4. Enter the captcha
5. Vehicle details appear

*What you'll see:*
✅ Vehicle make & model
✅ Registered owner name
✅ Insurance status
✅ Inspection status
✅ Logbook status

*Check driving licence:*
1. tims.ntsa.go.ke
2. "Verify Licence"
3. Enter ID number or licence number

📞 *NTSA Help:*
• Call: *0800 723 680* (free, 24/7)
• SMS: *22846*

*Renew inspection/insurance:*
→ Via eCitizen: ecitizen.go.ke

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  // .nhif_status <ID>
  "nhif_status": async (h) => {
    const id = h.args[0];
    if (!id) {
      return missingArgs(h, 'Usage: *.nhif_status <National ID>*\nExample: .nhif_status 12345678');
    }

    await withTyping(h, async () => {
      await reply(h,
`🏥 *NHIF/SHA STATUS CHECK*
━━━━━━━━━━━━━━━━━━━━━

ID: *${id}*

*Check your NHIF/SHA status:*

📱 *Option 1 — USSD (easiest):*
Dial *747# → Choose NHIF option
Works on any phone, any network!

🌐 *Option 2 — Online:*
1. Go to: *portal.nhif.or.ke*
2. Login or register
3. Check contribution history
4. Download statement

📲 *Option 3 — SHA Portal:*
1. Go to: *shif.or.ke*
2. Register with ID: ${id}
3. Check SHA membership status

*NHIF number recovery:*
SMS: NHIF ID to *21101*

📞 *NHIF/SHA Help:*
• Call: *0800 720 601* (free)
• SMS: *21101*

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  // .knec <index_number>
  "knec": async (h) => {
    const index = h.args[0];
    if (!index) {
      return missingArgs(h, 'Usage: *.knec <index number>*\nExample: .knec 1234567890');
    }

    await withTyping(h, async () => {
      await reply(h,
`📚 *KNEC RESULTS & CERTIFICATE*
━━━━━━━━━━━━━━━━━━━━━

Index Number: *${index}*

*Check KCSE/KCPE Results:*

🌐 *Online:*
1. Go to: *results.knec.ac.ke*
2. Select your examination (KCSE/KCPE)
3. Enter index number: ${index}
4. Enter your full registered name exactly as on the exam card
5. Submit to view your result

⚠️ *Note:* The results portal is usually only live for a few weeks after release. There is no SMS shortcode for checking results — that method was discontinued by KNEC.

*Verify Certificate (KNEC):*
1. knec.ac.ke → Certificate Verification
2. Enter certificate number
3. Verification result appears instantly

*Download transcript:*
1. eCitizen: ecitizen.go.ke
2. KNEC services
3. Apply for certified results

📞 *KNEC Contacts:*
• Call: 020 3317412 / 020 3317413
• Email: knec@knec.ac.ke

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  // .kuccps <index>
  "kuccps": async (h) => {
    const index = h.args[0];
    if (!index) {
      return missingArgs(h, 'Usage: *.kuccps <index number>*\nExample: .kuccps 1234567890');
    }

    await withTyping(h, async () => {
      await reply(h,
`🎓 *KUCCPS PLACEMENT CHECK*
━━━━━━━━━━━━━━━━━━━━━

Index: *${index}*

*Check university/college placement:*

🌐 *Online:*
1. Go to: *kuccps.ac.ke*
2. Click "Students Portal"
3. Login with index: ${index}
4. Your placement appears

*First time? Create account:*
1. kuccps.ac.ke → "New Student"
2. Index number + date of birth
3. Set password
4. Check placement

*Cluster points calculation:*
Type *.cluster* to see how cluster points work

*Revision of choices:*
• Only during official revision window
• Login to KUCCPS portal
• Change programme preferences

📞 *KUCCPS Help:*
• Call: 020 2227411
• Email: customercare@kuccps.ac.ke

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  // .helb_status <ID>
  "helb_status": async (h) => {
    const id = h.args[0];
    if (!id) {
      return missingArgs(h, 'Usage: *.helb_status <National ID>*\nExample: .helb_status 12345678');
    }

    await withTyping(h, async () => {
      await reply(h,
`🎓 *HELB LOAN STATUS*
━━━━━━━━━━━━━━━━━━━━━

ID: *${id}*

*Check your HELB loan status:*

🌐 *Online:*
1. Go to: *helbfunds.helb.co.ke*
2. Click "Check My Loan Status"
3. Enter ID: ${id}
4. Check disbursement & balance

*What you can check:*
✅ Loan application status
✅ Disbursement dates & amounts
✅ Outstanding balance
✅ Repayment history

*HELB Clearance Certificate:*
1. Login to HELB portal
2. Clearance → Apply
3. Pay any outstanding amount
4. Download certificate (needed for jobs!)

*Start repayment:*
• M-Pesa: Paybill *200200*
• Account number: Your ID number

📞 *HELB Help:*
• Call: 0711 052 000
• Email: helb@helb.co.ke

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  "nssf_status": async (h) => {
    const id = h.args[0];
    if (!id) {
      return missingArgs(h, 'Usage: *.nssf_status <National ID>*\nExample: .nssf_status 12345678');
    }
    await withTyping(h, async () => {
      await reply(h,
`🏦 *NSSF STATUS CHECK*
━━━━━━━━━━━━━━━━━━━━━

ID: *${id}*

*Check NSSF contributions & statement:*

🌐 *Online (Member Self Service):*
1. Go to: *portal.nssfkenya.co.ke*
2. Register/Login
3. View contribution history
4. Download statement

*NSSF Number recovery:*
SMS: NSSF to *20445*

*To claim NSSF benefits:*
1. Visit nearest NSSF branch
2. Bring: ID, NSSF card, bank details
3. Complete Form NF:1

📞 *NSSF Help:*
• Call: 020 2711671
• Email: info@nssfkenya.co.ke
• SMS: 20445

_Henry Ochibots 🇰🇪_`
      );
    });
  },

});

// ── DOCUMENT GUIDES ───────────────────────────────────────────────────────

Object.assign(module.exports, {

  "id_replace": async (h) => {
    await withTyping(h, async () => {
      await reply(h,
`🪪 *NATIONAL ID REPLACEMENT GUIDE*
━━━━━━━━━━━━━━━━━━━━━

*If you LOST your ID:*

*Step 1 — File OB at police station*
• Report loss at nearest police station
• Get OB number & police abstract
• Cost: ~KES 100-300

*Step 2 — Visit Huduma Centre / Sub-County*
Bring:
✅ Police abstract (OB report)
✅ Birth certificate
✅ 2 passport photos
✅ Fee: *KES 300*

*Step 3 — Biometrics*
• Fingerprints taken again
• Photo captured
• Wait: 3-6 weeks

*Step 4 — Collection*
• SMS notification when ready
• Collect from registration point

*If your ID is DAMAGED (not lost):*
• Bring damaged ID + KES 300
• No police report needed

📱 *Track your ID via eCitizen:*
ecitizen.go.ke → Immigration

📞 *Help:*
• Huduma Namba: 020 6900020

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  "passport": async (h) => {
    await withTyping(h, async () => {
      await reply(h,
`🛂 *PASSPORT APPLICATION GUIDE*
━━━━━━━━━━━━━━━━━━━━━

*Apply or Renew via eCitizen:*

🌐 *Step 1 — Apply Online:*
1. Go to: *ecitizen.go.ke*
2. Login or register
3. Department of Immigration → Passports
4. Select: New / Renewal / Child
5. Fill application form

*Documents needed:*
✅ National ID (original + copy)
✅ Birth certificate
✅ 2 passport-size photos (white background)
✅ Old passport (if renewing)
✅ For children: parent's ID, birth cert

*Fees (2024):*
• 32-page: *KES 4,550*
• 48-page: *KES 7,550*
• Express (3 days): *+KES 4,000*
• Child passport: *KES 3,050*

*Pay via M-Pesa:*
• Paybill: *222222*
• Account: Your eCitizen reference

*Step 2 — Biometrics Appointment:*
• Book slot at Immigration HQ or regional office
• Arrive with printed application + docs

*Processing time:*
• Normal: 10-14 working days
• Express: 3 working days

📞 *Immigration Department:*
• Call: 020 2222022
• ecitizen.go.ke

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  "birth_cert": async (h) => {
    await withTyping(h, async () => {
      await reply(h,
`👶 *BIRTH CERTIFICATE GUIDE*
━━━━━━━━━━━━━━━━━━━━━

*For child under 1 year (standard):*
Documents:
✅ Hospital birth notification
✅ Parent's National IDs
✅ Parents' marriage certificate (if married)

*Cost:* Free within 6 months of birth
After 6 months: KES 50

Visit: *Civil Registration Office*
(at Huduma Centre or Sub-County)

━━━━━━━━━━━━━━━━━━━━━
*Late Registration (over 1 year):*
This is what most people queue at cyber for!

*Step 1:* Get affidavit from magistrate
*Step 2:* Bring:
✅ Affidavit
✅ Primary school leaving certificate
✅ Church baptism cert (if any)
✅ Parent/guardian ID
✅ 2 witnesses with their IDs

*Step 3:* Visit Registration Officer
*Cost:* Affidavit ~KES 200 + stamp

━━━━━━━━━━━━━━━━━━━━━
*Replacement (lost certificate):*
✅ Parent's ID
✅ Old cert number if known
✅ KES 50 at Huduma Centre

📞 *Civil Registration:*
• Call: 020 2724973
• eCitizen: ecitizen.go.ke

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  "good_conduct": async (h) => {
    await withTyping(h, async () => {
      await reply(h,
`🏛️ *GOOD CONDUCT CERTIFICATE*
(Police Clearance Certificate)
━━━━━━━━━━━━━━━━━━━━━

*Apply online via eCitizen:*

*Step 1:*
1. Go to: *ecitizen.go.ke*
2. DCI → Certificate of Good Conduct
3. Create account / login
4. Fill application form

*Step 2 — Pay:*
• Fee: *KES 1,050*
• Via M-Pesa Paybill: 222222
• Account: Your eCitizen number

*Step 3 — Fingerprints:*
• Book appointment at nearest DCI office
• Bring: National ID, payment receipt
• Fingerprints taken on spot (5 minutes)

*Step 4 — Collection:*
• Processing: 3-7 working days
• Certificate sent to eCitizen account
• Download PDF or collect from DCI

*DCI Offices:*
• Nairobi: Upper Hill, DCI HQ
• County offices available nationwide

📞 *DCI Help:*
• Call: 020 3343100

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  "business_reg": async (h) => {
    await withTyping(h, async () => {
      await reply(h,
`🏢 *BUSINESS REGISTRATION GUIDE*
━━━━━━━━━━━━━━━━━━━━━

*Sole Proprietorship (Cheapest & fastest):*

*Step 1:* Check name availability
1. eCitizen → Business Registration
2. Search your preferred name
3. If available, proceed

*Step 2:* Register via eCitizen
1. ecitizen.go.ke → BRS
2. Fill business details
3. Cost: *KES 950*
4. Pay via M-Pesa

*Processing:* 1-3 working days
*Certificate:* Download from eCitizen

━━━━━━━━━━━━━━━━━━━━━
*After registration — also get:*

✅ *KRA PIN* (.kra_pin guide)
✅ *Business Permit* from your County
Cost: varies KES 5,000-50,000/year

✅ *NHIF employer registration*
✅ *NSSF employer registration*

*Business Permit renewal:*
• Every January at County offices
• Via eCitizen in many counties

📞 *Business Registration Service:*
• Call: 020 2227453
• ecitizen.go.ke

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  "kra_pin": async (h) => {
    await withTyping(h, async () => {
      await reply(h,
`🏛️ *KRA PIN REGISTRATION GUIDE*
━━━━━━━━━━━━━━━━━━━━━

*Register for KRA PIN on iTax:*

*Step 1:*
1. Go to: *itax.kra.go.ke*
2. Click "New PIN Registration"
3. Select: Individual / Non-Individual

*Step 2 — Fill details:*
✅ National ID number
✅ Full name (as on ID)
✅ Date of birth
✅ Email address (yours!)
✅ Mobile number
✅ Physical address

*Step 3 — Submit:*
• PIN issued instantly online
• Certificate emailed to you
• Format: A + 9 digits + letter (e.g. A001234567T)

*Why you need KRA PIN:*
✅ Opening bank account
✅ Employment / payslips
✅ Business registration
✅ Property purchase/sale
✅ Car purchase
✅ Scholarship applications
✅ Government tenders

*Lost PIN? Recover:*
1. itax.kra.go.ke → Forgot PIN
2. Enter ID number
3. PIN sent to your registered email

📞 *KRA Help:*
• Call: 0711 099 999

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  "ecitizen": async (h) => {
    await withTyping(h, async () => {
      await reply(h,
`💻 *ECITIZEN ACCOUNT SETUP*
━━━━━━━━━━━━━━━━━━━━━

*Create your eCitizen account:*

🌐 1. Go to: *ecitizen.go.ke*
2. Click *"Create Account"*
3. Select *"Citizen"*
4. Enter your National ID number
5. Enter date of birth
6. Set email + password
7. Verify email

*eCitizen services available:*
🪪 National ID replacement
🛂 Passport application
📋 Good Conduct certificate
🏢 Business registration
📄 Birth/death certificates
🚗 NTSA vehicle services
🌾 Agriculture services
And 200+ more government services!

*Pay via M-Pesa on eCitizen:*
All payments go to Paybill *222222*
Account = your eCitizen reference number

*Forgot password?*
ecitizen.go.ke → Login → Forgot Password
Enter email or ID → Reset link sent

*Mobile app:*
Download "eCitizen Kenya" from Play Store / App Store

📞 *eCitizen Help:*
• Call: 020 2211000
• Email: info@ecitizen.go.ke

_Henry Ochibots 🇰🇪 — Tuko Pamoja_`
      );
    });
  },

});

// ── DOCUMENT GENERATORS ───────────────────────────────────────────────────

Object.assign(module.exports, {

  // .cv <full name> | <job title> | <years experience> | <highest education>
  "cv": async (h) => {
    const text = h.args.join(' ');
    if (!text || text.length < 5) {
      return missingArgs(h,
        'Usage: *.cv <your name> | <job you want> | <your experience> | <your education>*\n\nExample:\n.cv John Otieno | Sales Representative | 3 years in retail | KCSE Certificate'
      );
    }

    await withTyping(h, async () => {
      const parts = text.split('|').map(s => s.trim());
      const name = parts[0] || 'Your Name';
      const jobTitle = parts[1] || 'Job Title';
      const experience = parts[2] || 'Your experience';
      const education = parts[3] || 'Your education';
      const phone = h.senderNumber || '+254 XXX XXX XXX';

      const cv = `
━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *CURRICULUM VITAE*
━━━━━━━━━━━━━━━━━━━━━━━━━

*${name.toUpperCase()}*
${jobTitle}

━━━━━━━━━━━━━━━━━━━━━━━━━
*CONTACT INFORMATION*
━━━━━━━━━━━━━━━━━━━━━━━━━
📱 Phone: ${phone}
📧 Email: [Add your email]
📍 Location: [Add your location]
🔗 LinkedIn: [Optional]

━━━━━━━━━━━━━━━━━━━━━━━━━
*PROFESSIONAL SUMMARY*
━━━━━━━━━━━━━━━━━━━━━━━━━
A dedicated and results-oriented ${jobTitle} with ${experience}. 
Committed to delivering high-quality work and contributing 
positively to organizational goals.

━━━━━━━━━━━━━━━━━━━━━━━━━
*EDUCATION*
━━━━━━━━━━━━━━━━━━━━━━━━━
🎓 ${education}
   [Institution Name] — [Year Completed]

[Add more education here]

━━━━━━━━━━━━━━━━━━━━━━━━━
*WORK EXPERIENCE*
━━━━━━━━━━━━━━━━━━━━━━━━━
💼 [Current/Last Job Title]
   [Company Name] | [Start Date] – [End Date]
   • [Key responsibility]
   • [Achievement with numbers if possible]
   • [Another achievement]

[Add more experience]

━━━━━━━━━━━━━━━━━━━━━━━━━
*KEY SKILLS*
━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [Skill 1]      ✅ [Skill 2]
✅ [Skill 3]      ✅ [Skill 4]
✅ Communication  ✅ Teamwork

━━━━━━━━━━━━━━━━━━━━━━━━━
*REFEREES*
━━━━━━━━━━━━━━━━━━━━━━━━━
Available upon request.

━━━━━━━━━━━━━━━━━━━━━━━━━
_Generated by Henry Ochibots 🇰🇪_
_Tuko Pamoja — Free for all Kenyans_
━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await reply(h, cv);
      await reply(h,
`✅ *Your CV draft is ready!*

*Next steps:*
1. Copy the CV above
2. Fill in the [bracket] sections with your real info
3. Add more work experience/skills
4. Save to Word or Notes app
5. Print at any cyber/shop near you

💡 *Tips for a great CV:*
• Keep to 1-2 pages max
• Use numbers: "Increased sales by 30%"
• Tailor it to each job you apply for
• Always proofread before sending

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  // .cover <name> | <company> | <job title>
  "cover": async (h) => {
    const text = h.args.join(' ');
    if (!text || text.length < 5) {
      return missingArgs(h,
        'Usage: *.cover <your name> | <company name> | <job title>*\n\nExample:\n.cover Mary Wanjiku | Safaricom | Customer Care Agent'
      );
    }

    await withTyping(h, async () => {
      const parts = text.split('|').map(s => s.trim());
      const name = parts[0] || 'Your Name';
      const company = parts[1] || 'Company Name';
      const jobTitle = parts[2] || 'Position';
      const today = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });

      const letter = `
━━━━━━━━━━━━━━━━━━━━━━━━━
📝 *COVER LETTER*
━━━━━━━━━━━━━━━━━━━━━━━━━

${name}
[Your Address]
[Town, County]
[Phone Number]
[Email Address]

${today}

The Hiring Manager
${company}
[Company Address]

━━━━━━━━━━━━━━━━━━━━━━━━━
*RE: APPLICATION FOR ${jobTitle.toUpperCase()} POSITION*
━━━━━━━━━━━━━━━━━━━━━━━━━

Dear Hiring Manager,

I am writing to express my strong interest in the ${jobTitle} 
position at ${company}. Having followed ${company}'s work 
closely, I am excited about the opportunity to contribute 
to your team.

In my previous role(s), I demonstrated [mention a key 
achievement relevant to this job]. I bring [number] years 
of experience in [relevant field], with a proven track 
record of [specific achievement with numbers if possible].

What particularly draws me to ${company} is [mention 
something specific about the company — their values, 
their products, their reputation]. I believe my skills 
in [relevant skill 1] and [relevant skill 2] align well 
with your team's needs.

I am a [positive trait: dedicated/hardworking/passionate] 
professional who [key quality]. I am confident that my 
[education/experience] and commitment to excellence would 
make me a valuable asset to ${company}.

I would welcome the opportunity to discuss how my 
background and skills can contribute to your team's 
success. I am available for an interview at your 
earliest convenience.

Thank you for considering my application.

Yours faithfully,

${name}
[Phone Number]
[Email]

━━━━━━━━━━━━━━━━━━━━━━━━━
_Generated by Henry Ochibots 🇰🇪_`;

      await reply(h, letter);
      await reply(h,
`✅ *Cover letter draft ready!*

Fill in the [bracket] sections with YOUR specific details.

💡 *Key tips:*
• Research ${company} before customizing
• First paragraph: why this specific job & company
• Middle: your best achievement with numbers
• Last: confident & professional close

_Henry Ochibots 🇰🇪 — Tuko Pamoja_`
      );
    });
  },

  // .invoice <client name> | <item: amount, item: amount> | <notes>
  "invoice": async (h) => {
    const text = h.args.join(' ');
    if (!text || text.length < 3) {
      return missingArgs(h,
        'Usage: *.invoice <client name> | <items and amounts> | <your business name>*\n\nExample:\n.invoice John Kamau | Web Design: 15000, Logo: 5000 | TechKe Solutions'
      );
    }

    await withTyping(h, async () => {
      const parts = text.split('|').map(s => s.trim());
      const clientName = parts[0] || 'Client Name';
      const itemsText = parts[1] || 'Services: 0';
      const businessName = parts[2] || h.config.botOwner + ' Services';

      // Parse items
      const items = itemsText.split(',').map(item => {
        const colonIdx = item.lastIndexOf(':');
        if (colonIdx === -1) return { name: item.trim(), amount: 0 };
        return {
          name: item.slice(0, colonIdx).trim(),
          amount: parseFloat(item.slice(colonIdx + 1).trim()) || 0
        };
      });

      const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
      const vat = subtotal * 0.16;
      const total = subtotal + vat;
      const invNumber = 'INV-' + Date.now().toString().slice(-6);
      const today = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
      const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });

      let itemLines = items.map(i =>
        `${i.name.padEnd(25)} ${kes(i.amount)}`
      ).join('\n');

      const invoice = `
━━━━━━━━━━━━━━━━━━━━━━━━━
🧾 *INVOICE*
━━━━━━━━━━━━━━━━━━━━━━━━━

*${businessName.toUpperCase()}*
[Your Address] | [Phone] | [Email]

Invoice No: *${invNumber}*
Date: ${today}
Due Date: ${dueDate}

━━━━━━━━━━━━━━━━━━━━━━━━━
*BILL TO:*
${clientName}
[Client Address]

━━━━━━━━━━━━━━━━━━━━━━━━━
*DESCRIPTION                AMOUNT*
━━━━━━━━━━━━━━━━━━━━━━━━━
${itemLines}
━━━━━━━━━━━━━━━━━━━━━━━━━
Subtotal:          ${kes(subtotal)}
VAT (16%):         ${kes(vat)}
*TOTAL DUE:        ${kes(total)}*
━━━━━━━━━━━━━━━━━━━━━━━━━

*PAYMENT DETAILS:*
M-Pesa: [Your phone number]
Bank: [Bank name, Account no.]
Paybill: [If any]

*Terms:* Payment due within 14 days

Thank you for your business! 🙏

━━━━━━━━━━━━━━━━━━━━━━━━━
_Generated by Henry Ochibots 🇰🇪_`;

      await reply(h, invoice);
    });
  },

  // .resign <your name> | <company name> | <last working date>
  "resign": async (h) => {
    const text = h.args.join(' ');
    if (!text) {
      return missingArgs(h,
        'Usage: *.resign <your name> | <company> | <last working date>*\n\nExample:\n.resign Jane Mwangi | ABC Company Ltd | 31st January 2025'
      );
    }

    await withTyping(h, async () => {
      const parts = text.split('|').map(s => s.trim());
      const name = parts[0] || 'Your Name';
      const company = parts[1] || 'Company Name';
      const lastDate = parts[2] || '[Last Working Date]';
      const today = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });

      const letter = `
━━━━━━━━━━━━━━━━━━━━━━━━━
📝 *RESIGNATION LETTER*
━━━━━━━━━━━━━━━━━━━━━━━━━

${name}
[Your Department]
[Your Job Title]

${today}

The Manager / HR Department
${company}

━━━━━━━━━━━━━━━━━━━━━━━━━
*SUBJECT: RESIGNATION NOTICE*
━━━━━━━━━━━━━━━━━━━━━━━━━

Dear Sir/Madam,

I am writing to formally notify you of my resignation 
from my position as [Your Job Title] at ${company}, 
effective ${lastDate}.

I have genuinely valued my time at ${company} and am 
grateful for the opportunities, mentorship, and 
experience I have gained here. The skills and 
knowledge I have developed will continue to benefit 
me throughout my career.

During my remaining time, I am fully committed to 
ensuring a smooth transition. I am happy to assist 
with training my replacement and completing any 
outstanding projects.

I hope we can maintain a positive relationship going 
forward, and I wish ${company} continued success.

Thank you for the opportunity to be part of this team.

Yours faithfully,

___________________
${name}
[Job Title]
[Phone Number]
[Date]

━━━━━━━━━━━━━━━━━━━━━━━━━
_Generated by Henry Ochibots 🇰🇪_`;

      await reply(h, letter);
      await reply(h,
`✅ *Resignation letter ready!*

📌 *Important notes:*
• Check your contract for notice period (usually 1 month)
• Print 2 copies — keep one signed copy
• Deliver to HR or your direct manager
• Follow up to ensure you get:
  - Certificate of service
  - NSSF withdrawal form
  - NHIF transfer letter
  - Final salary + any leave pay

_Henry Ochibots 🇰🇪 — Tuko Pamoja_`
      );
    });
  },

  // .payslip <employee name> | <gross salary>
  "payslip": async (h) => {
    const text = h.args.join(' ');
    if (!text) {
      return missingArgs(h,
        'Usage: *.payslip <employee name> | <gross salary>*\n\nExample:\n.payslip Peter Otieno | 45000'
      );
    }

    await withTyping(h, async () => {
      const parts = text.split('|').map(s => s.trim());
      const empName = parts[0] || 'Employee Name';
      const gross = parseFloat(parts[1]) || 0;

      if (!gross) return reply(h, '❌ Please include a valid gross salary.');

      // Calculate deductions
      let tax = 0, taxable = gross;
      if (taxable > 0) { const b = Math.min(taxable, 24000); tax += b * 0.10; taxable -= b; }
      if (taxable > 0) { const b = Math.min(taxable, 8333); tax += b * 0.25; taxable -= b; }
      if (taxable > 0) { tax += taxable * 0.30; }
      tax = Math.max(0, tax - 2400);

      const nhif = 500;
      let nssf = gross <= 7000 ? gross * 0.06 : gross <= 36000 ? 420 + (gross - 7000) * 0.06 : 2160;
      nssf = Math.round(nssf);

      const totalDeductions = tax + nhif + nssf;
      const netPay = gross - totalDeductions;
      const month = new Date().toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });

      const slip = `
━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *PAYSLIP — ${month.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━━━━━━

*[Company Name]*
[Company Address]

Employee: *${empName}*
ID/Emp No: [Employee ID]
Designation: [Job Title]
Department: [Department]

━━━━━━━━━━━━━━━━━━━━━━━━━
*EARNINGS*
━━━━━━━━━━━━━━━━━━━━━━━━━
Basic Salary:      ${kes(gross)}
House Allowance:   [If any]
Transport Allow:   [If any]
Other Allowances:  [If any]
─────────────────────────
*GROSS PAY:        ${kes(gross)}*

━━━━━━━━━━━━━━━━━━━━━━━━━
*DEDUCTIONS*
━━━━━━━━━━━━━━━━━━━━━━━━━
PAYE Tax:          ${kes(tax)}
NHIF/SHA:          ${kes(nhif)}
NSSF:              ${kes(nssf)}
Other:             [If any]
─────────────────────────
*TOTAL DEDUCTIONS: ${kes(totalDeductions)}*

━━━━━━━━━━━━━━━━━━━━━━━━━
✅ *NET PAY:        ${kes(netPay)}*
━━━━━━━━━━━━━━━━━━━━━━━━━

Payment Method: [Bank/M-Pesa]
Payment Date: [Date paid]

Prepared by: _______________
Received by: _______________

━━━━━━━━━━━━━━━━━━━━━━━━━
_Generated by Henry Ochibots 🇰🇪_`;

      await reply(h, slip);
    });
  },

});

// ── EDUCATION ─────────────────────────────────────────────────────────────

Object.assign(module.exports, {

  // .kcse english:A, maths:B+, ...
  "kcse": async (h) => {
    const text = h.args.join(' ');
    if (!text) {
      return missingArgs(h,
        'Usage: *.kcse <subject:grade, subject:grade, ...>*\n\nExample:\n.kcse english:A, maths:B+, kiswahili:B, biology:C+, chemistry:C, physics:C+, history:B-, cre:A-'
      );
    }

    await withTyping(h, async () => {
      const gradePoints = {
        'A': 12, 'A-': 11,
        'B+': 10, 'B': 9, 'B-': 8,
        'C+': 7, 'C': 6, 'C-': 5,
        'D+': 4, 'D': 3, 'D-': 2,
        'E': 1
      };

      const meanGrade = {
        12: 'A', 11: 'A-',
        10: 'B+', 9: 'B', 8: 'B-',
        7: 'C+', 6: 'C', 5: 'C-',
        4: 'D+', 3: 'D', 2: 'D-',
        1: 'E'
      };

      const pairs = text.split(',').map(p => p.trim());
      let totalPoints = 0;
      let count = 0;
      let subjectLines = '';

      for (const pair of pairs) {
        const colonIdx = pair.lastIndexOf(':');
        if (colonIdx === -1) continue;
        const subject = pair.slice(0, colonIdx).trim();
        const grade = pair.slice(colonIdx + 1).trim().toUpperCase();
        const points = gradePoints[grade];
        if (points !== undefined) {
          totalPoints += points;
          count++;
          subjectLines += `${subject.padEnd(20)} ${grade} (${points} pts)\n`;
        }
      }

      if (count === 0) return reply(h, '❌ No valid subjects found. Use format like: english:A, maths:B+');

      const meanPoints = totalPoints / count;
      const roundedMean = Math.round(meanPoints);
      const grade = meanGrade[roundedMean] || 'E';

      // Minimum entry requirements
      let universityEligible = meanPoints >= 6 ? '✅ Eligible for university (C+ and above)' : '❌ Below C+ — consider TVET/college';
      let recommendations = '';
      if (meanPoints >= 11) recommendations = '🏆 Outstanding! Aim for Medicine, Engineering, Law at top universities';
      else if (meanPoints >= 9) recommendations = '🎓 Good performance! Eligible for most degree programmes';
      else if (meanPoints >= 7) recommendations = '📚 Apply to university or diploma programmes';
      else if (meanPoints >= 5) recommendations = '📚 Consider TVET diploma or certificate courses';
      else recommendations = '📚 Consider bridging courses or retaking specific subjects';

      await reply(h,
`📚 *KCSE GRADE CALCULATOR*
━━━━━━━━━━━━━━━━━━━━━

*SUBJECT BREAKDOWN:*
${subjectLines}
━━━━━━━━━━━━━━━━━━━━━
Subjects graded: ${count}
Total points: ${totalPoints}
Mean points: ${meanPoints.toFixed(2)}

*📊 MEAN GRADE: ${grade}*
━━━━━━━━━━━━━━━━━━━━━

${universityEligible}

💡 *Recommendation:*
${recommendations}

*Next steps:*
→ KUCCPS: kuccps.ac.ke
→ Check cluster points: .cluster
→ HELB loan: .helb_status

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  "bursary": async (h) => {
    await withTyping(h, async () => {
      await reply(h,
`🎓 *BURSARY & SCHOLARSHIP GUIDE*
━━━━━━━━━━━━━━━━━━━━━

*1. CDF BURSARY (Constituencies)*
Who: Needy students, all levels
How to apply:
• Visit your MP's constituency office
• Fill bursary application form
• Bring: School admission letter,
  National ID/birth cert, fee structure,
  parent/guardian ID, poverty declaration

*2. COUNTY BURSARY*
• Visit your County Education Office
• Or apply via county website
• Some counties: ecounty portal

*3. NATIONAL GOVERNMENT AFFIRMATIVE*
For: Girl child, special needs, etc.
Apply via: Ministry of Education

*4. HELB LOAN* (university)
• helbfunds.helb.co.ke
• Open to all university students
• Repay after graduation

*5. SCHOLARSHIPS*
Government scholarships:
• Check: scholarships.go.ke
• Ministry of Education website

International:
• Commonwealth Scholarships
• DAAD (Germany)
• MasterCard Foundation

*Timeline for CDF:*
Usually announced: Jan-March & July-Sept
Apply early — positions fill fast!

📞 *Help:*
• CDF: cdf.go.ke
• County education office

_Henry Ochibots 🇰🇪 — Education for all!_`
      );
    });
  },

});

// ── HEALTH & EMERGENCY ────────────────────────────────────────────────────

Object.assign(module.exports, {

  "emergency": async (h) => {
    await withTyping(h, async () => {
      await reply(h,
`🚨 *KENYA EMERGENCY CONTACTS*
━━━━━━━━━━━━━━━━━━━━━

*NATIONAL EMERGENCY:*
🚔 Police: *999* or *112* (any network)
🚑 Ambulance: *999* or *112*
🚒 Fire Brigade: *999*
📱 Emergency (Safaricom): *116*

━━━━━━━━━━━━━━━━━━━━━
*GENDER & DOMESTIC VIOLENCE:*
• Gender Violence Recovery Centre: *0800 720 990* (free, 24/7)
• Befrienders Kenya (mental health): *0800 723 253*
• Child Helpline: *116* (free, 24/7)

━━━━━━━━━━━━━━━━━━━━━
*HEALTH EMERGENCIES:*
• KEMSA (medical supplies): 0800 724 551
• KNH Emergency: 020 2726300
• Kenyatta National Hospital: 020 2726300
• Moi Teaching & Referral (Eldoret): 053 2033471
• Coast General (Mombasa): 041 2314201

━━━━━━━━━━━━━━━━━━━━━
*NAIROBI SPECIFIC:*
• City Mortuary: 020 2214427
• Nairobi Hospital: 020 2845000
• Aga Khan Hospital: 020 3662000
• MP Shah Hospital: 020 4291000

━━━━━━━━━━━━━━━━━━━━━
*COUNTY CONTACTS:*
Type your county below for specific contacts:
.hospitals nairobi
.hospitals mombasa
.hospitals kisumu
.hospitals nakuru

📌 *Save these numbers on your phone NOW!*

_Henry Ochibots 🇰🇪 — Stay safe, Tuko Pamoja_`
      );
    });
  },

  "hospitals": async (h) => {
    const county = h.args.join(' ').toLowerCase() || null;
    await withTyping(h, async () => {
      const hospitalData = {
        nairobi: `*NAIROBI HOSPITALS:*\n• Kenyatta National: 020 2726300\n• Nairobi Hospital: 020 2845000\n• Aga Khan: 020 3662000\n• MP Shah: 020 4291000\n• Karen Hospital: 020 8884000\n• Gertrudes Children: 020 2011000`,
        mombasa: `*MOMBASA HOSPITALS:*\n• Coast General: 041 2314201\n• Aga Khan Mombasa: 041 2227710\n• Pandya Memorial: 041 2220028`,
        kisumu: `*KISUMU HOSPITALS:*\n• Jaramogi Oginga Odinga: 057 2020600\n• Aga Khan Kisumu: 057 2025282`,
        nakuru: `*NAKURU HOSPITALS:*\n• PGH Nakuru: 051 2210234\n• War Memorial: 051 2212706`,
        eldoret: `*ELDORET HOSPITALS:*\n• Moi Teaching & Referral: 053 2033471\n• Mediheal Hospital: 053 2062800`,
      };

      const data = county ? hospitalData[county] : null;

      await reply(h,
`🏥 *HOSPITALS & CLINICS FINDER*
━━━━━━━━━━━━━━━━━━━━━

${data || '*How to find your nearest hospital:*\n\n📱 Option 1 — Google Maps:\n"Nearest hospital to [your location]"\n\n🌐 Option 2 — Ministry of Health:\nhealth.go.ke → facilities\n\n📱 Option 3 — SHA Facility Finder:\nshif.or.ke → Find Facility\nSearch by county/sub-county\n\nType: .hospitals nairobi\nor: .hospitals mombasa etc.'}

━━━━━━━━━━━━━━━━━━━━━
*NHIF/SHA Accredited Facilities:*
Check: nhif.or.ke/facilites
Or call: 0800 720 601

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  "blood": async (h) => {
    await withTyping(h, async () => {
      await reply(h,
`🩸 *BLOOD DONATION IN KENYA*
━━━━━━━━━━━━━━━━━━━━━

*Kenya National Blood Transfusion Service:*

📞 Call: *0800 720 020* (free)
📧 Email: knbts@health.go.ke
🌐 Web: knbts.go.ke

*Main donation centers:*
• Nairobi: Upper Hill Medical Centre
• Mombasa: Coast General Hospital  
• Kisumu: JOOTRH Blood Bank
• Nakuru: PGH Nakuru
• Eldoret: MTRH Blood Bank

*Donate requirements:*
✅ Age: 16-65 years
✅ Weight: Above 50kg
✅ Healthy (no cold/fever today)
✅ Bring your National ID
✅ No donation in last 3 months

*Blood types always needed:*
O- (universal donor) — most needed!
O+, A+, B+, AB+

*Why donate?*
One donation saves up to 3 lives! 💪

*Mobile blood drives:*
Check KNBTS social media for locations near you.

_Henry Ochibots 🇰🇪 — Okoa Maisha!_`
      );
    });
  },

});

// ── COMMUNITY TOOLS ───────────────────────────────────────────────────────

Object.assign(module.exports, {

  "matatu": async (h) => {
    const route = h.args.join(' ');
    await withTyping(h, async () => {
      await reply(h,
`🚌 *MATATU ROUTES & FARES*
━━━━━━━━━━━━━━━━━━━━━

${route ? `Route searched: *${route}*\n\n` : ''
}*How to find matatu info:*

📱 *App (best for Nairobi):*
• Download *"Mawimbi"* app (Google Play)
• Real-time matatu tracking Nairobi

🌐 *Online:*
• matatukulabu.com — route database
• Googling: "matatu route [from] to [to]"

*Common Nairobi fare ranges (2024):*
• CBD ↔ Westlands: KES 30-50
• CBD ↔ Karen: KES 50-100
• CBD ↔ Kasarani: KES 50-80
• CBD ↔ Rongai: KES 80-150
• CBD ↔ Kikuyu: KES 80-120
• CBD ↔ Thika: KES 80-150

*Intercounty buses (2024 approx):*
• Nairobi ↔ Mombasa: KES 900-1,800
• Nairobi ↔ Kisumu: KES 800-1,500
• Nairobi ↔ Nakuru: KES 300-600
• Nairobi ↔ Eldoret: KES 700-1,200

📌 Fares vary by time (peak/off-peak)
📌 Book bus online: buupass.com

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  "huduma": async (h) => {
    const county = h.args.join(' ') || null;
    await withTyping(h, async () => {
      await reply(h,
`🏛️ *HUDUMA CENTRE GUIDE*
━━━━━━━━━━━━━━━━━━━━━

*Services at Huduma Centre:*
✅ National ID (new, replace, update)
✅ Passport application & collection
✅ Birth & death certificates  
✅ NHIF/NSSF registration
✅ KRA PIN services
✅ NTSA (driving licence, PSV)
✅ Business registration
✅ Court fee payment
✅ Good Conduct application
✅ eCitizen registration help

*Major Huduma Centres:*
📍 Nairobi: Teleposta Towers (CBD)
📍 Nairobi: GPO Annex, Haile Selassie Ave
📍 Mombasa: Treasury Square
📍 Kisumu: Mega City Mall
📍 Nakuru: Corner House
📍 Eldoret: Zion Mall

*Opening hours:*
Monday–Friday: 8:00 AM – 5:00 PM
Saturday: 8:00 AM – 1:00 PM
Sunday & Public Holidays: Closed

*Book appointment:*
• hudumacentre.go.ke
• Call: 0800 221 112 (free)

💡 *Tip:* Go early (before 9am) or late (after 3pm) to avoid queues!

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  "jobs": async (h) => {
    await withTyping(h, async () => {
      await reply(h,
`💼 *KENYA JOBS GUIDE*
━━━━━━━━━━━━━━━━━━━━━

*Top job sites for Kenya:*

🌐 *Formal/Professional:*
• brightermonday.co.ke
• fuzu.com (Kenya-focused)
• jobwebkenya.com
• linkedin.com → Search Kenya
• glassdoor.com

🏛️ *Government Jobs:*
• publicservice.go.ke (PSC)
• recruit.tsc.go.ke (Teachers)
• kdf.mil.ke (KDF recruitment)
• nis.go.ke
• county websites (county jobs)

📱 *Casual/Gig work:*
• Turnup.work (verified gigs)
• Lynk.co.ke (skilled freelancers)
• Upwork.com (international remote)
• jobinkenya.com (daily gigs)

*WhatsApp Job Groups:*
Many legit jobs shared in county/town WhatsApp groups.
Avoid any group asking for payment to join!

*Tips to get hired:*
1. Use .cv to build your CV
2. Tailor CV to each job
3. Apply to 5-10 jobs per day
4. Follow up after 1 week
5. Use LinkedIn (professional network)

📌 *Avoid:*
❌ Anyone asking you to pay to apply
❌ "Work from home earn 50k/day" — scams!
❌ Unsolicited job offers via WhatsApp

_Henry Ochibots 🇰🇪 — Tuko Pamoja_`
      );
    });
  },

});

// ── ALIAS shortcuts ───────────────────────────────────────────────────────

Object.assign(module.exports, {
  "paye_calc": async (h) => module.exports["paye"](h),
  "tax": async (h) => module.exports["paye"](h),
  "netsalary": async (h) => module.exports["paye"](h),
  "send_mpesa": async (h) => module.exports["mpesa_cost"](h),
  "voter_check": async (h) => module.exports["voter"](h),
  "check_voter": async (h) => module.exports["voter"](h),
  "id_lost": async (h) => module.exports["id_replace"](h),
  "replace_id": async (h) => module.exports["id_replace"](h),
  "birth_certificate": async (h) => module.exports["birth_cert"](h),
  "police_clearance": async (h) => module.exports["good_conduct"](h),
  "register_business": async (h) => module.exports["business_reg"](h),
  "pin_registration": async (h) => module.exports["kra_pin"](h),
  "generate_cv": async (h) => module.exports["cv"](h),
  "make_invoice": async (h) => module.exports["invoice"](h),
  "grade_calculator": async (h) => module.exports["kcse"](h),
  "gpa": async (h) => module.exports["kcse"](h),
  "emergency_numbers": async (h) => module.exports["emergency"](h),
  "donate_blood": async (h) => module.exports["blood"](h),
});
