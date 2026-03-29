export type Lang = 'en' | 'id';

const en = {
  // General
  welcome:
    `👋 Welcome to *TalangIn*!\n\n` +
    `Track shared expenses and debts with your household.\n\n` +
    `*What you can do:*\n` +
    `💸 Log expenses & split bills\n` +
    `💳 Record payments to housemates\n` +
    `📊 View who owes what\n` +
    `🤝 Log debts you owe\n` +
    `📢 Broadcast messages to your household\n` +
    `📦 Track shared item usage\n\n` +
    `Tap *🏠 Set Household* to get started.`,
  welcomeBack: `👋 Welcome back! Use the buttons below.`,
  whatsNew:
    `🆕 *What's New in v1\\.2\\.0*\n\n` +
    `• 🤖 *AI mode removed* — the bot is now fully button\\-driven for a more reliable experience\n` +
    `• ⚙️ *Cleaner settings* — just nickname and language`,
  helpText:
    `🏠 *TalangIn — Household Debt Manager*\n\n` +
    `Use the buttons on your keyboard to navigate all features\\.\n\n` +
    `*🏡 Household*\n` +
    `• Tap 🏠 to create or join a household\n\n` +
    `*💸 Expenses & Payments*\n` +
    `• 💸 *Log Expense* — split a bill among members\n` +
    `• 💳 *Log Payment* — record paying someone back\n` +
    `• 🤝 *I Owe* — self\\-log a debt you owe\n\n` +
    `*📊 Balances*\n` +
    `• 📊 *View Balances* — see who owes what\n\n` +
    `*📢 More*\n` +
    `• 📢 *Broadcast* — send a message to all members\n` +
    `• 📦 *Item Tracker* — track shared household items\n` +
    `• ⚙️ *Settings* — change your nickname or language\n\n` +
    `Tap ❌ Cancel or type /cancel at any time to abort an action\\.`,
  cancel: '❌ Cancelled. What would you like to do?',
  notInHousehold: 'You are not in any household. Create or join one first.',
  notActiveMember: 'You are not an active member of that household.',

  // Household
  householdCreated:
    `🏠 *Household created!*\n\n` +
    `Name: *{name}*\nCurrency: *{currency}*\n\n` +
    `Share this join code with your household members:\n` +
    `\`{joinCode}\`\n\n` +
    `They can tap *Join with Code* in the bot to join.`,
  joinRequestSent: `✅ Join request sent to *{householdName}*\\! Waiting for the owner to approve.`,
  joinInvalidCode: `❌ No household found with join code \`{code}\`. Double-check the code and try again.`,
  alreadyMember: `You are already a member of *{householdName}*.`,
  kickedCannotRejoin: `You were removed from *{householdName}* and cannot rejoin.`,
  pendingRequestExists:
    `You already have a pending join request for *{householdName}*. Please wait for the owner to respond.`,
  joinRequestReceived:
    `👋 *New join request*\n\n{requester} wants to join *{householdName}*.\n\nApprove or deny:`,
  memberApproved: `✅ {member} has been added to *{householdName}*.`,
  memberDenied: `❌ {member}'s request to join *{householdName}* was denied.`,
  approvalNotify: `🎉 Your request to join *{householdName}* has been *approved*\\! You are now a member.`,
  denialNotify: `😞 Your request to join *{householdName}* was denied by the owner.`,
  pendingJoinRequest: `👋 *Pending join request*\n\n{requester} wants to join *{householdName}*.\n\nApprove or deny:`,
  ownerNotNotified:
    `⚠️ The household owner couldn't be notified right now. They'll see the request when they next interact with the bot.`,

  // Expense
  awaitingProof: '🧾 Got it! Please send your *invoice or receipt* as a photo or document.',
  expensePreview:
    `📋 *Expense Preview*\n\n` +
    `Description: *{description}*\n` +
    `Total: *{amount}*\n` +
    `Household: *{householdName}*\n\n` +
    `*Debts to be created:*\n{splits}`,
  expenseSplitLine: '  • {member} owes you {amount}',
  expenseConfirmed:
    `✅ Expense recorded!\n\n*{description}* — {amount}\n{count} debt(s) created.`,
  debtorNotification:
    `💸 You owe {actor} *{amount}* for *{description}* (Household: {householdName})`,
  memberNotFound:
    `❓ I couldn't find member "{identifier}" in this household. Use their @username or exact first name.`,
  selectHousehold: 'Which household is this for?',
  splitError: 'Split error: {message}',

  // Payment
  awaitingPaymentProof:
    '🧾 Got it! Please send your *payment receipt or proof* as a photo or document.',
  paymentPreview:
    `💳 *Payment Preview*\n\n` +
    `You paid: *{creditor}*\n` +
    `Amount: *{amount}*\n` +
    `Household: *{householdName}*\n` +
    `Description: {description}`,
  paymentConfirmed: `✅ Payment recorded!\n\nYou paid {creditor} *{amount}*`,
  paymentCapped: `\n_(Capped at your outstanding balance)_`,
  creditorNotification:
    `💰 {actor} recorded a payment of *{amount}* to you (Household: {householdName})`,
  noOutstandingDebt: `You have no outstanding debt to {creditor}.`,
  overpaymentWarningNoDebt:
    `\n⚠️ You have no recorded debt to {creditor} in this household. Payment will be capped at 0.`,
  overpaymentWarning:
    `\n⚠️ Payment exceeds your outstanding debt of {outstanding}. It will be capped at that amount.`,
  payeeNotFound:
    `❓ I couldn't find member "{identifier}" in this household. Use their @username or exact first name.`,
  selectPaymentHousehold: 'Which household is this payment for?',
  specifyAmount: 'Please specify an amount, e.g. "I paid alice 50".',

  // Balances
  balancesHeader: `📊 *Balances — {householdName}*\n\n`,
  youOwe: '*You owe:*\n',
  youAreOwed: '*You are owed:*\n',
  allSettled: '_All settled up! No outstanding debts._\n',
  notInAnyHousehold: 'You are not in any household yet. Create one or join using a code.',

  // Broadcast
  broadcastPreview:
    `📢 *Broadcast Preview*\n\n` +
    `Household: *{householdName}*\n` +
    `Recipients: *{count}* member(s)\n\n` +
    `Message:\n_{message}_`,
  broadcastConfirmed: `✅ Broadcast sent to {count} member(s).`,
  broadcastReceived: `📢 *Broadcast from {sender}* (Household: {householdName})\n\n{message}`,
  broadcastNoMembers: 'There are no other members in this household to broadcast to.',
  selectBroadcastHousehold: 'Which household do you want to broadcast to?',

  // Household check
  householdSummary: `📋 *Household Summary — {householdName}*\n\n`,
  notOwner: 'Only household owners can use this command.',
  settledUp: '✅ settled up',

  // Kick
  kickPreview:
    `⚠️ *Kick Member Preview*\n\nRemove {member} from *{householdName}*?\n\n` +
    `_This cannot be undone. Their history will be kept._`,
  kickConfirmed: `✅ {member} has been removed from *{householdName}*.`,
  kickedNotification: `You have been removed from the household *{householdName}* by the owner.`,
  kickMemberNotFound:
    `❓ I couldn't find member "{identifier}" in *{householdName}*. Use their @username or exact first name.`,
  notHouseholdOwner: 'You are not the owner of any household. Only owners can kick members.',
  whichHousehold: 'Which household? You own: {households}',

  // Settings
  settingsHeader: `⚙️ *Settings*\n\nCurrent language: *{language}*\n\nChange language:`,
  languageChanged: `✅ Language changed to *{language}*.`,
  languagePicker: `🌐 Please choose your language:`,

  // System
  rateLimited: '⏳ Slow down! You are sending messages too quickly.',
  awaitingProofReminder:
    '📎 Please send your receipt or proof as a photo or document.\n\nTap ❌ Cancel or type /cancel to abort.',
  awaitingConfirmReminder: '👆 Please use the buttons above to confirm or cancel.',
  cancelledAction: '❌ Action cancelled.',

  // Nickname
  nicknamePrompt: '✏️ Type your new nickname (this is how others see you):',
  nicknameSet: '✅ Nickname set to *{nickname}*.',


  // Household picker
  pickHousehold: '🏠 Which household would you like to use?',
  noHouseholds: "You're not in any household yet. What would you like to do?",
  createHouseholdBtn: '➕ Create Household',
  joinHouseholdBtn: '🔗 Join with Code',
  createHouseholdNamePrompt: '🏠 What would you like to name your household?',
  createHouseholdCurrencyPrompt: '💱 Pick a currency for *{name}*:',
  joinHouseholdCodePrompt: '🔗 Enter the join code:',
  activeHouseholdSet: '✅ Now working in: *{name}*',
  changeHousehold: '🔄 Change Household',

  // Household management menu
  hhMenuHeader: '🏠 *{name}*\nWhat would you like to do?',
  hhMenuAllDebts: '📋 All Debts',
  hhMenuKick: '👢 Kick Member',
  hhMenuJoinCode: '🔑 Join Code',
  owes: 'owes',
  hhJoinCodeDisplay: '🔑 *Join Code for {name}*\n\n`{joinCode}`\n\nShare this with anyone you want to invite.',
  hhNoMembersToKick: 'There are no other members to remove.',
  hhKickPickMember: '👢 Select a member to remove:',
  hhKickConfirmPrompt: '⚠️ Remove *{member}* from *{householdName}*?\n\n_This cannot be undone._',
  hhKickConfirmBtn: '✅ Yes, Remove',

  // I Owe
  iOweCreditorPrompt: '👤 Who do you owe? Select a member:',
  iOweDescPrompt: '📝 What is this debt for? (description)',
  iOweAmountPrompt: '💰 How much do you owe? (enter a number)',
  iOwePreview:
    `🤝 *I Owe — Preview*\n\n` +
    `You owe: *{creditor}*\n` +
    `Amount: *{amount}*\n` +
    `For: _{description}_\n` +
    `Household: *{householdName}*`,
  iOweConfirmed: '✅ Debt recorded. *{creditor}* has been notified.',
  iOweNotification:
    '🤝 *{debtor}* says they owe you *{amount}* for _{description}_ (Household: {householdName})',

  // Item Tracker
  itemTrackerMenu: '📦 *Item Tracker*\nWhat would you like to do?',
  viewCounts: '👀 View Counts',
  noCounts: '_No usage recorded yet._',
  logUsageBtn: '➕ Log Usage',
  itemPick: '📦 Select an item:',
  quantityPrompt: '🔢 How many? (enter a whole number)',
  usageRecorded: '✅ Recorded *{quantity}* × {item}.',
  manageItems: '⚙️ Manage Items',
  addItemPrompt: '📝 Enter the name of the new item:',
  itemAdded: '✅ Item added: *{name}*',
  removeItemPick: '🗑 Select item to remove:',
  itemRemoved: '✅ Item removed: *{name}*',
  resetPick: '🔄 Select item to reset counts:',
  resetConfirmed: '✅ Counts reset for *{name}*.',
  noItems: '_No items yet. Add one via Manage Items._',
  ownerOnlyAction: '🔒 Only the household owner can do this.',

  // Button mode wizard prompts
  descPrompt: '📝 What was the expense for? (description)',
  amountPrompt: '💰 What is the total amount? (e.g. 50 or 50.50)',
  splitTypePick: '⚖️ How should this be split?',
  splitEvenBtn: '➗ Evenly',
  splitCustomBtn: '🔢 Custom amounts',
  membersPick: '👥 Select members to include in the split (tap to toggle):',
  membersDoneBtn: '✅ Done',
  customAmountPrompt: '💰 How much does *{member}* owe? (enter a number)',
  creditorPick: '👤 Who did you pay?',
  fullOrCustom: '💳 How much are you paying?',
  fullPayBtn: '💯 Full balance ({amount})',
  customPayBtn: '✏️ Custom amount',
  payAmountPrompt: '💰 Enter the amount:',
  proofPrompt: '📎 Please send a photo or document as proof (receipt / transfer screenshot):',
  noDebtToMember: 'You have no recorded debt to {name} in this household.',

  // Settings menu
  settingsMenu: '⚙️ *Settings*\nNickname: *{nickname}*\nLanguage: *{language}*',
  settingsNicknameBtn: '✏️ Set Nickname',
  settingsLangBtn: '🌐 Change Language',
  buttonModeUseButtons: '👇 Use the buttons below to navigate.',
  // Weekly summary
  weeklySummaryHeader: '📅 *Weekly Summary — {householdName}*\n',
  weeklySummaryAllSettled: '_No outstanding debts — all settled up!_ ✅\n',
  weeklySummaryYouOwe: '💸 *You owe:*\n',
  weeklySummaryYouAreOwed: '💰 *You are owed:*\n',
  weeklySummaryItemHeader: '📦 *Item Usage (last 7 days):*\n',
  weeklySummaryNoItems: '_No item usage recorded this week._\n',
  weeklySummaryFooter: '💡 _Tap /start to see your full balances._',

  broadcastPhotoCaption: '📢 *Broadcast from {sender}* (Household: {householdName})',
  broadcastAddCaption: '⚠️ Please add a caption as your broadcast message.',
  broadcastPhotoPreview:
    `📢 *Broadcast Preview*\n\n` +
    `Household: *{householdName}*\n` +
    `Recipients: *{count}* member(s)\n\n` +
    `📷 Photo with caption:\n_{message}_`,
};

const id: typeof en = {
  // General
  welcome:
    `👋 Selamat datang di *TalangIn*!\n\n` +
    `Catat pengeluaran dan utang bersama anggota rumah tangga kamu.\n\n` +
    `*Yang bisa kamu lakukan:*\n` +
    `💸 Catat pengeluaran & bagi tagihan\n` +
    `💳 Catat pembayaran ke teman serumah\n` +
    `📊 Lihat siapa berutang ke siapa\n` +
    `🤝 Catat utang yang kamu punya\n` +
    `📢 Kirim pesan ke seluruh anggota\n` +
    `📦 Lacak penggunaan barang bersama\n\n` +
    `Ketuk *🏠 Set Household* untuk mulai.`,
  welcomeBack: `👋 Selamat datang kembali! Gunakan tombol di bawah.`,
  whatsNew:
    `🆕 *Yang Baru di v1\\.2\\.0*\n\n` +
    `• 🤖 *Mode AI dihapus* — bot kini sepenuhnya berbasis tombol untuk pengalaman yang lebih andal\n` +
    `• ⚙️ *Pengaturan lebih simpel* — hanya nama panggilan dan bahasa`,
  helpText:
    `🏠 *TalangIn — Manajemen Utang Rumah Tangga*\n\n` +
    `Gunakan tombol di keyboard untuk mengakses semua fitur\\.\n\n` +
    `*🏡 Rumah Tangga*\n` +
    `• Ketuk 🏠 untuk membuat atau bergabung ke rumah tangga\n\n` +
    `*💸 Pengeluaran & Pembayaran*\n` +
    `• 💸 *Log Expense* — bagi tagihan ke anggota\n` +
    `• 💳 *Log Payment* — catat pembayaran utang\n` +
    `• 🤝 *I Owe* — catat sendiri utang yang kamu punya\n\n` +
    `*📊 Saldo*\n` +
    `• 📊 *View Balances* — lihat siapa berutang ke siapa\n\n` +
    `*📢 Lainnya*\n` +
    `• 📢 *Broadcast* — kirim pesan ke semua anggota\n` +
    `• 📦 *Item Tracker* — lacak penggunaan barang bersama\n` +
    `• ⚙️ *Settings* — ubah nama panggilan atau bahasa\n\n` +
    `Ketuk ❌ Cancel atau ketik /cancel kapan saja untuk membatalkan aksi\\.`,
  cancel: '❌ Dibatalkan. Mau ngapain sekarang?',
  notInHousehold: 'Kamu belum bergabung ke rumah tangga manapun. Buat atau bergabung dulu.',
  notActiveMember: 'Kamu bukan anggota aktif rumah tangga tersebut.',

  // Household
  householdCreated:
    `🏠 *Rumah tangga dibuat!*\n\n` +
    `Nama: *{name}*\nMata uang: *{currency}*\n\n` +
    `Bagikan kode ini ke anggota rumah tanggamu:\n` +
    `\`{joinCode}\`\n\n` +
    `Mereka bisa ketuk *Join with Code* di bot untuk bergabung.`,
  joinRequestSent: `✅ Permintaan bergabung ke *{householdName}* sudah terkirim\\! Tunggu pemilik untuk menyetujui.`,
  joinInvalidCode: `❌ Tidak ada rumah tangga dengan kode \`{code}\`. Periksa kembali kode dan coba lagi.`,
  alreadyMember: `Kamu sudah menjadi anggota *{householdName}*.`,
  kickedCannotRejoin: `Kamu sudah dikeluarkan dari *{householdName}* dan tidak bisa bergabung lagi.`,
  pendingRequestExists:
    `Kamu sudah punya permintaan bergabung yang menunggu untuk *{householdName}*. Tunggu pemilik untuk merespons.`,
  joinRequestReceived:
    `👋 *Permintaan bergabung baru*\n\n{requester} ingin bergabung ke *{householdName}*.\n\nSetujui atau tolak:`,
  memberApproved: `✅ {member} sudah ditambahkan ke *{householdName}*.`,
  memberDenied: `❌ Permintaan {member} untuk bergabung ke *{householdName}* ditolak.`,
  approvalNotify: `🎉 Permintaanmu untuk bergabung ke *{householdName}* telah *disetujui*\\! Kamu sekarang menjadi anggota.`,
  denialNotify: `😞 Permintaanmu untuk bergabung ke *{householdName}* ditolak oleh pemilik.`,
  pendingJoinRequest:
    `👋 *Permintaan bergabung menunggu*\n\n{requester} ingin bergabung ke *{householdName}*.\n\nSetujui atau tolak:`,
  ownerNotNotified:
    `⚠️ Pemilik rumah tangga tidak bisa diberitahu sekarang. Mereka akan melihat permintaan ini saat berinteraksi dengan bot.`,

  // Expense
  awaitingProof: '🧾 Oke! Kirimkan *faktur atau struk* kamu sebagai foto atau dokumen.',
  expensePreview:
    `📋 *Pratinjau Pengeluaran*\n\n` +
    `Keterangan: *{description}*\n` +
    `Total: *{amount}*\n` +
    `Rumah tangga: *{householdName}*\n\n` +
    `*Utang yang akan dibuat:*\n{splits}`,
  expenseSplitLine: '  • {member} berutang ke kamu {amount}',
  expenseConfirmed: `✅ Pengeluaran tercatat!\n\n*{description}* — {amount}\n{count} utang dibuat.`,
  debtorNotification:
    `💸 Kamu berutang ke {actor} sebesar *{amount}* untuk *{description}* (Rumah tangga: {householdName})`,
  memberNotFound:
    `❓ Tidak dapat menemukan anggota "{identifier}" di rumah tangga ini. Gunakan @username atau nama depan mereka.`,
  selectHousehold: 'Ini untuk rumah tangga yang mana?',
  splitError: 'Error pembagian: {message}',

  // Payment
  awaitingPaymentProof:
    '🧾 Oke! Kirimkan *bukti transfer atau pembayaran* kamu sebagai foto atau dokumen.',
  paymentPreview:
    `💳 *Pratinjau Pembayaran*\n\n` +
    `Kamu bayar: *{creditor}*\n` +
    `Jumlah: *{amount}*\n` +
    `Rumah tangga: *{householdName}*\n` +
    `Keterangan: {description}`,
  paymentConfirmed: `✅ Pembayaran tercatat!\n\nKamu membayar {creditor} sebesar *{amount}*`,
  paymentCapped: `\n_(Dibatasi pada saldo utangmu)_`,
  creditorNotification:
    `💰 {actor} mencatat pembayaran sebesar *{amount}* kepadamu (Rumah tangga: {householdName})`,
  noOutstandingDebt: `Kamu tidak punya utang ke {creditor}.`,
  overpaymentWarningNoDebt:
    `\n⚠️ Kamu tidak punya utang ke {creditor} di rumah tangga ini. Pembayaran akan dibatasi ke 0.`,
  overpaymentWarning:
    `\n⚠️ Pembayaran melebihi utangmu sebesar {outstanding}. Akan dibatasi pada jumlah itu.`,
  payeeNotFound:
    `❓ Tidak dapat menemukan anggota "{identifier}" di rumah tangga ini. Gunakan @username atau nama depan mereka.`,
  selectPaymentHousehold: 'Ini untuk rumah tangga yang mana?',
  specifyAmount: 'Tolong tentukan jumlahnya, misalnya "Saya bayar alice 50".',

  // Balances
  balancesHeader: `📊 *Saldo — {householdName}*\n\n`,
  youOwe: '*Kamu berutang:*\n',
  youAreOwed: '*Orang lain berutang ke kamu:*\n',
  allSettled: '_Semua lunas! Tidak ada utang tersisa._\n',
  notInAnyHousehold:
    'Kamu belum bergabung ke rumah tangga manapun. Buat atau bergabung menggunakan kode.',

  // Broadcast
  broadcastPreview:
    `📢 *Pratinjau Siaran*\n\n` +
    `Rumah tangga: *{householdName}*\n` +
    `Penerima: *{count}* anggota\n\n` +
    `Pesan:\n_{message}_`,
  broadcastConfirmed: `✅ Siaran terkirim ke {count} anggota.`,
  broadcastReceived: `📢 *Siaran dari {sender}* (Rumah tangga: {householdName})\n\n{message}`,
  broadcastNoMembers: 'Tidak ada anggota lain di rumah tangga ini untuk dikirim siaran.',
  selectBroadcastHousehold: 'Ke rumah tangga mana kamu ingin mengirim siaran?',

  // Household check
  householdSummary: `📋 *Ringkasan Rumah Tangga — {householdName}*\n\n`,
  notOwner: 'Hanya pemilik rumah tangga yang bisa menggunakan perintah ini.',
  settledUp: '✅ lunas',

  // Kick
  kickPreview:
    `⚠️ *Pratinjau Mengeluarkan Anggota*\n\nKeluarkan {member} dari *{householdName}*?\n\n` +
    `_Ini tidak bisa dibatalkan. Riwayat mereka akan tetap tersimpan._`,
  kickConfirmed: `✅ {member} sudah dikeluarkan dari *{householdName}*.`,
  kickedNotification: `Kamu telah dikeluarkan dari rumah tangga *{householdName}* oleh pemilik.`,
  kickMemberNotFound:
    `❓ Tidak dapat menemukan anggota "{identifier}" di *{householdName}*. Gunakan @username atau nama depan mereka.`,
  notHouseholdOwner: 'Kamu bukan pemilik rumah tangga manapun. Hanya pemilik yang bisa mengeluarkan anggota.',
  whichHousehold: 'Rumah tangga mana? Yang kamu miliki: {households}',

  // Settings
  settingsHeader: `⚙️ *Pengaturan*\n\nBahasa saat ini: *{language}*\n\nGanti bahasa:`,
  languageChanged: `✅ Bahasa berhasil diubah ke *{language}*.`,
  languagePicker: `🌐 Silakan pilih bahasa kamu:`,

  // System
  rateLimited: '⏳ Pelan-pelan! Kamu mengirim pesan terlalu cepat.',
  awaitingProofReminder:
    '📎 Kirimkan struk atau buktimu sebagai foto atau dokumen.\n\nKetuk ❌ Cancel atau ketik /cancel untuk membatalkan.',
  awaitingConfirmReminder: '👆 Gunakan tombol di atas untuk mengkonfirmasi atau membatalkan.',
  cancelledAction: '❌ Tindakan dibatalkan.',

  // Nickname
  nicknamePrompt: '✏️ Ketik nama panggilan baru kamu (begini orang lain melihat kamu):',
  nicknameSet: '✅ Nama panggilan diatur ke *{nickname}*.',


  // Household picker
  pickHousehold: '🏠 Rumah tangga mana yang ingin kamu gunakan?',
  noHouseholds: 'Kamu belum bergabung ke rumah tangga manapun. Mau ngapain?',
  createHouseholdBtn: '➕ Buat Rumah Tangga',
  joinHouseholdBtn: '🔗 Gabung dengan Kode',
  createHouseholdNamePrompt: '🏠 Apa nama rumah tangga kamu?',
  createHouseholdCurrencyPrompt: '💱 Pilih mata uang untuk *{name}*:',
  joinHouseholdCodePrompt: '🔗 Masukkan kode bergabung:',
  activeHouseholdSet: '✅ Sekarang menggunakan: *{name}*',
  changeHousehold: '🔄 Ganti Rumah Tangga',

  // Household management menu
  hhMenuHeader: '🏠 *{name}*\nMau ngapain?',
  hhMenuAllDebts: '📋 Semua Utang',
  hhMenuKick: '👢 Keluarkan Anggota',
  hhMenuJoinCode: '🔑 Kode Bergabung',
  owes: 'berutang',
  hhJoinCodeDisplay: '🔑 *Kode Bergabung untuk {name}*\n\n`{joinCode}`\n\nBagikan ini ke siapa pun yang ingin kamu undang.',
  hhNoMembersToKick: 'Tidak ada anggota lain yang bisa dikeluarkan.',
  hhKickPickMember: '👢 Pilih anggota yang ingin dikeluarkan:',
  hhKickConfirmPrompt: '⚠️ Keluarkan *{member}* dari *{householdName}*?\n\n_Ini tidak bisa dibatalkan._',
  hhKickConfirmBtn: '✅ Ya, Keluarkan',

  // I Owe
  iOweCreditorPrompt: '👤 Kamu berutang ke siapa? Pilih anggota:',
  iOweDescPrompt: '📝 Untuk apa utang ini? (deskripsi)',
  iOweAmountPrompt: '💰 Berapa jumlah utangmu? (masukkan angka)',
  iOwePreview:
    `🤝 *I Owe — Pratinjau*\n\n` +
    `Kamu berutang ke: *{creditor}*\n` +
    `Jumlah: *{amount}*\n` +
    `Untuk: _{description}_\n` +
    `Rumah tangga: *{householdName}*`,
  iOweConfirmed: '✅ Utang tercatat. *{creditor}* telah diberitahu.',
  iOweNotification:
    '🤝 *{debtor}* bilang mereka berutang *{amount}* ke kamu untuk _{description}_ (Rumah tangga: {householdName})',

  // Item Tracker
  itemTrackerMenu: '📦 *Pelacak Barang*\nMau ngapain?',
  viewCounts: '👀 Lihat Hitungan',
  noCounts: '_Belum ada penggunaan yang tercatat._',
  logUsageBtn: '➕ Catat Penggunaan',
  itemPick: '📦 Pilih barang:',
  quantityPrompt: '🔢 Berapa banyak? (masukkan angka bulat)',
  usageRecorded: '✅ Tercatat *{quantity}* × {item}.',
  manageItems: '⚙️ Kelola Barang',
  addItemPrompt: '📝 Masukkan nama barang baru:',
  itemAdded: '✅ Barang ditambahkan: *{name}*',
  removeItemPick: '🗑 Pilih barang yang ingin dihapus:',
  itemRemoved: '✅ Barang dihapus: *{name}*',
  resetPick: '🔄 Pilih barang untuk direset hitungannya:',
  resetConfirmed: '✅ Hitungan direset untuk *{name}*.',
  noItems: '_Belum ada barang. Tambahkan melalui Kelola Barang._',
  ownerOnlyAction: '🔒 Hanya pemilik rumah tangga yang bisa melakukan ini.',

  // Button mode wizard prompts
  descPrompt: '📝 Untuk apa pengeluaran ini? (deskripsi)',
  amountPrompt: '💰 Berapa total jumlahnya? (misal 50 atau 50.50)',
  splitTypePick: '⚖️ Bagaimana cara membaginya?',
  splitEvenBtn: '➗ Merata',
  splitCustomBtn: '🔢 Jumlah kustom',
  membersPick: '👥 Pilih anggota yang ikut dalam pembagian (ketuk untuk toggle):',
  membersDoneBtn: '✅ Selesai',
  customAmountPrompt: '💰 Berapa yang harus dibayar *{member}*? (masukkan angka)',
  creditorPick: '👤 Kamu bayar ke siapa?',
  fullOrCustom: '💳 Berapa yang ingin kamu bayar?',
  fullPayBtn: '💯 Saldo penuh ({amount})',
  customPayBtn: '✏️ Jumlah kustom',
  payAmountPrompt: '💰 Masukkan jumlahnya:',
  proofPrompt: '📎 Kirimkan foto atau dokumen sebagai bukti (struk / screenshot transfer):',
  noDebtToMember: 'Kamu tidak punya utang ke {name} di rumah tangga ini.',

  // Settings menu
  settingsMenu: '⚙️ *Pengaturan*\nNama panggilan: *{nickname}*\nBahasa: *{language}*',
  settingsNicknameBtn: '✏️ Atur Nama Panggilan',
  settingsLangBtn: '🌐 Ganti Bahasa',
  buttonModeUseButtons: '👇 Gunakan tombol di bawah untuk navigasi.',
  // Weekly summary
  weeklySummaryHeader: '📅 *Ringkasan Mingguan — {householdName}*\n',
  weeklySummaryAllSettled: '_Tidak ada utang — semua lunas!_ ✅\n',
  weeklySummaryYouOwe: '💸 *Kamu berutang:*\n',
  weeklySummaryYouAreOwed: '💰 *Orang lain berutang ke kamu:*\n',
  weeklySummaryItemHeader: '📦 *Penggunaan Barang (7 hari terakhir):*\n',
  weeklySummaryNoItems: '_Belum ada penggunaan barang minggu ini._\n',
  weeklySummaryFooter: '💡 _Ketuk /start untuk melihat saldo lengkap kamu._',

  broadcastPhotoCaption: '📢 *Siaran dari {sender}* (Rumah tangga: {householdName})',
  broadcastAddCaption: '⚠️ Tambahkan caption sebagai pesan siaran kamu.',
  broadcastPhotoPreview:
    `📢 *Pratinjau Siaran*\n\n` +
    `Rumah tangga: *{householdName}*\n` +
    `Penerima: *{count}* anggota\n\n` +
    `📷 Foto dengan caption:\n_{message}_`,
};

export const strings = { en, id };
