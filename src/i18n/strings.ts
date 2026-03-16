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
    `🆕 *What's New in TalangIn*\n\n` +
    `• 🔘 *Button Mode* — step\\-by\\-step wizards for all features\n` +
    `• 🏠 *Create/Join household* — directly from the button menu\n` +
    `• 👤 *Nicknames* — set a display name others will see\n` +
    `• 🤝 *I Owe* — self\\-log debts you owe to others\n` +
    `• 📦 *Item Tracker* — track shared household item usage\n` +
    `• 📷 *Photo broadcasts* — send photos to your household\n` +
    `• ❌ *Cancel buttons* — back out of any action anytime\n` +
    `• ✅ *Split flexibility* — include or exclude yourself from expense splits`,
  helpText:
    `🏠 *TalangIn — Household Debt Manager*\n\n` +
    `Just talk to me naturally — no commands needed. I'll always ask you to confirm before doing anything.\n\n` +
    `*🏡 Set up a household*\n` +
    `• "Create a household called Kost Mawar"\n` +
    `• "Join with code ABCD1234"\n\n` +
    `*🧾 Split an expense*\n` +
    `• "I paid 120 for dinner, split with alice and bob" — splits evenly between all three of you\n` +
    `• "Split 200 to everyone" — splits with all household members\n` +
    `• "Alice and bob each owe me 50 for groceries" — they each owe you that amount\n` +
    `• "Paid 90 for drinks, alice pays 30 and bob pays 60" — custom split\n` +
    `Attach your receipt as a photo or file when sending.\n\n` +
    `*💸 Record a payment (paying someone back)*\n` +
    `• "I paid alice 80" — partial repayment\n` +
    `• "Paid bob full" / "Settled my debt with alice" — clears your full balance with them\n` +
    `Attach your transfer proof as a photo or file.\n\n` +
    `*📊 Check balances*\n` +
    `• "What do I owe?" / "Show my balance" — your personal debt summary\n` +
    `• "Show all debts in Kost Mawar" _(owner only)_ — see everyone's debts in a household\n\n` +
    `*📢 Broadcast a message*\n` +
    `• "Tell everyone dinner is ready"\n` +
    `• "Announce: please pay your dues by Friday"\n\n` +
    `*👥 Manage members*\n` +
    `• "Kick alice from Kost Mawar" _(owner only)_\n\n` +
    `Type *cancel* at any time to abort a pending action.`,
  cancel: '❌ Cancelled. What would you like to do?',
  notInHousehold: 'You are not in any household. Create or join one first.',
  notActiveMember: 'You are not an active member of that household.',

  // Household
  householdCreated:
    `🏠 *Household created!*\n\n` +
    `Name: *{name}*\nCurrency: *{currency}*\n\n` +
    `Share this join code with your household members:\n` +
    `\`{joinCode}\`\n\n` +
    `They can join by sending: \`join {joinCode}\``,
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
  unknownIntent: "🤔 I didn't understand that. Type /help to see what I can do.",
  llmSwitchTip: '\n\n💡 _Tip: Switch to Button Mode in /settings for a more reliable experience._',
  awaitingProofReminder:
    '📎 I\'m waiting for your invoice/proof. Please send it as a photo or document.\n\nType "cancel" to abort.',
  awaitingConfirmReminder: '👆 Please use the buttons above to confirm or cancel.',
  awaitingHouseholdReminder:
    '👆 Please select a household using the buttons above, or type "cancel" to abort.',
  classifyError: 'Sorry, I had trouble understanding that. Please try again.',
  cancelledAction: '❌ Action cancelled.',
  attachmentUnknown:
    "I received your file, but I'm not sure what to do with it.\n\n" +
    'If this is a receipt, please send it with a caption like:\n' +
    '_"Dinner AUD 35, split with @alice and @bob"_\n\n' +
    'Or send a text message first, then the proof.',
  attachmentNoCaption:
    "I received your file but couldn't determine its purpose from the caption. " +
    'Please describe the expense or payment in your next message.',

  // LLM disclaimer
  llmReviewWarning: '\n\n🤖 _Interpreted by AI — review carefully before confirming._',

  // Nickname
  nicknamePrompt: '✏️ Type your new nickname (this is how others see you):',
  nicknameSet: '✅ Nickname set to *{nickname}*.',

  // Mode switching
  switchToLlmWarning:
    `⚠️ *Switching to LLM (AI) Mode*\n\n` +
    `In LLM mode, you interact via free text and the AI interprets your messages. ` +
    `Results may occasionally be inaccurate.\n\n` +
    `The reply keyboard will be hidden.`,
  llmModeConfirmBtn: '✅ I understand, switch to LLM Mode',
  llmModeBackBtn: '❌ Cancel',
  modeChangedToLlm: '🤖 Switched to LLM Mode. Send a message to get started.',
  modeChangedToButton: '🔘 Switched to Button Mode.',
  alreadyButtonMode: 'You are already in Button Mode.',
  alreadyLlmMode: 'You are already in LLM Mode.',

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
  settingsMenu: '⚙️ *Settings*\nNickname: *{nickname}*\nMode: *{mode}*\nLanguage: *{language}*',
  settingsNicknameBtn: '✏️ Set Nickname',
  settingsLangBtn: '🌐 Change Language',
  settingsSwitchLlmBtn: '🤖 Switch to LLM Mode',
  settingsSwitchButtonBtn: '🔘 Switch to Button Mode',
  buttonModeUseButtons: '👇 Use the buttons below to navigate.',
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
    `🆕 *Yang Baru di TalangIn*\n\n` +
    `• 🔘 *Mode Tombol* — panduan langkah demi langkah untuk semua fitur\n` +
    `• 🏠 *Buat/Gabung rumah tangga* — langsung dari menu tombol\n` +
    `• 👤 *Nama panggilan* — atur nama yang dilihat orang lain\n` +
    `• 🤝 *I Owe* — catat sendiri utang yang kamu punya\n` +
    `• 📦 *Pelacak Barang* — lacak penggunaan barang bersama\n` +
    `• 📷 *Siaran foto* — kirim foto ke anggota rumah tangga\n` +
    `• ❌ *Tombol batal* — batalkan aksi kapan saja\n` +
    `• ✅ *Fleksibel split* — masukkan atau keluarkan dirimu dari pembagian`,
  helpText:
    `🏠 *TalangIn — Manajemen Utang Rumah Tangga*\n\n` +
    `Cukup ngobrol dengan aku secara alami — tidak perlu perintah khusus. Aku selalu minta konfirmasi sebelum melakukan apapun.\n\n` +
    `*🏡 Buat rumah tangga*\n` +
    `• "Buat rumah tangga bernama Kost Mawar"\n` +
    `• "Bergabung dengan kode ABCD1234"\n\n` +
    `*🧾 Bagi pengeluaran*\n` +
    `• "Saya bayar 120 untuk makan malam, bagi dengan alice dan bob" — dibagi rata termasuk kamu\n` +
    `• "Bagi 200 ke semua" — dibagi ke seluruh anggota\n` +
    `• "Alice dan bob masing-masing berutang 50 ke saya untuk sembako" — mereka masing-masing berutang segitu\n` +
    `• "Bayar 90 untuk minuman, alice bayar 30 dan bob bayar 60" — bagi kustom\n` +
    `Lampirkan struk sebagai foto atau file saat mengirim.\n\n` +
    `*💸 Catat pembayaran (membayar utang)*\n` +
    `• "Saya bayar alice 80" — pembayaran sebagian\n` +
    `• "Bayar bob full" / "Lunasi utang ke alice" — melunasi semua utangmu ke mereka\n` +
    `Lampirkan bukti transfer sebagai foto atau file.\n\n` +
    `*📊 Cek saldo*\n` +
    `• "Apa yang aku berutang?" / "Tunjukkan saldoku" — ringkasan utangmu\n` +
    `• "Tampilkan semua utang di Kost Mawar" _(hanya pemilik)_ — lihat utang semua anggota\n\n` +
    `*📢 Siaran pesan*\n` +
    `• "Beritahu semua orang bahwa makan malam sudah siap"\n` +
    `• "Umumkan: harap bayar iuran sebelum Jumat"\n\n` +
    `*👥 Kelola anggota*\n` +
    `• "Keluarkan alice dari Kost Mawar" _(hanya pemilik)_\n\n` +
    `Ketik *cancel* kapan saja untuk membatalkan tindakan yang sedang menunggu.`,
  cancel: '❌ Dibatalkan. Mau ngapain sekarang?',
  notInHousehold: 'Kamu belum bergabung ke rumah tangga manapun. Buat atau bergabung dulu.',
  notActiveMember: 'Kamu bukan anggota aktif rumah tangga tersebut.',

  // Household
  householdCreated:
    `🏠 *Rumah tangga dibuat!*\n\n` +
    `Nama: *{name}*\nMata uang: *{currency}*\n\n` +
    `Bagikan kode ini ke anggota rumah tanggamu:\n` +
    `\`{joinCode}\`\n\n` +
    `Mereka bisa bergabung dengan mengirim: \`join {joinCode}\``,
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
  unknownIntent: '🤔 Aku tidak mengerti itu. Ketik /help untuk melihat yang bisa aku lakukan.',
  llmSwitchTip: '\n\n💡 _Tips: Ganti ke Mode Tombol di /settings untuk pengalaman yang lebih andal._',
  awaitingProofReminder:
    '📎 Aku sedang menunggu faktur/buktimu. Kirimkan sebagai foto atau dokumen.\n\nKetik "cancel" untuk membatalkan.',
  awaitingConfirmReminder: '👆 Gunakan tombol di atas untuk mengkonfirmasi atau membatalkan.',
  awaitingHouseholdReminder:
    '👆 Pilih rumah tangga menggunakan tombol di atas, atau ketik "cancel" untuk membatalkan.',
  classifyError: 'Maaf, aku kesulitan memahami itu. Coba lagi.',
  cancelledAction: '❌ Tindakan dibatalkan.',
  attachmentUnknown:
    'Aku menerima file kamu, tapi tidak tahu harus diapakan.\n\n' +
    'Kalau ini struk, kirim dengan caption seperti:\n' +
    '_"Makan malam 35.000, bagi dengan @alice dan @bob"_\n\n' +
    'Atau kirim pesan teks dulu, baru buktinya.',
  attachmentNoCaption:
    'Aku menerima file kamu tapi tidak bisa menentukan tujuannya dari caption. ' +
    'Tolong jelaskan pengeluaran atau pembayarannya di pesan berikutnya.',

  // LLM disclaimer
  llmReviewWarning: '\n\n🤖 _Ditafsirkan oleh AI — periksa dengan teliti sebelum mengkonfirmasi._',

  // Nickname
  nicknamePrompt: '✏️ Ketik nama panggilan baru kamu (begini orang lain melihat kamu):',
  nicknameSet: '✅ Nama panggilan diatur ke *{nickname}*.',

  // Mode switching
  switchToLlmWarning:
    `⚠️ *Beralih ke Mode LLM (AI)*\n\n` +
    `Dalam mode LLM, kamu berinteraksi melalui teks bebas dan AI menafsirkan pesanmu. ` +
    `Hasilnya terkadang mungkin tidak akurat.\n\n` +
    `Keyboard tombol akan disembunyikan.`,
  llmModeConfirmBtn: '✅ Saya mengerti, beralih ke Mode LLM',
  llmModeBackBtn: '❌ Batal',
  modeChangedToLlm: '🤖 Beralih ke Mode LLM. Kirim pesan untuk mulai.',
  modeChangedToButton: '🔘 Beralih ke Mode Tombol.',
  alreadyButtonMode: 'Kamu sudah dalam Mode Tombol.',
  alreadyLlmMode: 'Kamu sudah dalam Mode LLM.',

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
  settingsMenu: '⚙️ *Pengaturan*\nNama panggilan: *{nickname}*\nMode: *{mode}*\nBahasa: *{language}*',
  settingsNicknameBtn: '✏️ Atur Nama Panggilan',
  settingsLangBtn: '🌐 Ganti Bahasa',
  settingsSwitchLlmBtn: '🤖 Beralih ke Mode LLM',
  settingsSwitchButtonBtn: '🔘 Beralih ke Mode Tombol',
  buttonModeUseButtons: '👇 Gunakan tombol di bawah untuk navigasi.',
  broadcastPhotoCaption: '📢 *Siaran dari {sender}* (Rumah tangga: {householdName})',
  broadcastAddCaption: '⚠️ Tambahkan caption sebagai pesan siaran kamu.',
  broadcastPhotoPreview:
    `📢 *Pratinjau Siaran*\n\n` +
    `Rumah tangga: *{householdName}*\n` +
    `Penerima: *{count}* anggota\n\n` +
    `📷 Foto dengan caption:\n_{message}_`,
};

export const strings = { en, id };
