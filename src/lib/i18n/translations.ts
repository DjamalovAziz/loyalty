export const locales = ["en", "ru", "uz"] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  uz: "O'zbekcha",
};

type Dict = Record<string, string>;

export const translations: Record<Locale, Dict> = {
  en: {
    "landing.title": "LoyaltySphere",
    "landing.description":
      "Telegram-native multi-tenant loyalty platform. No email, no passwords to remember for clients — just a phone number and Telegram.",
    "landing.cta": "Register your business",

    "signup.title": "Register your business",
    "signup.name": "Full name",
    "signup.phone": "+998901234567",
    "signup.password": "Password",
    "signup.confirmPassword": "Confirm password",
    "signup.submit": "Continue with Telegram",
    "signup.submitting": "Submitting...",
    "signup.passwordMismatch": "Passwords do not match.",
    "signup.almostDone": "Almost done!",
    "signup.confirmInTelegram": "Confirm your phone number in Telegram to finish registration.",
    "signup.openTelegram": "Open Telegram",

    "staffSignin.title": "Staff sign in",
    "staffSignin.phone": "+998901234567",
    "staffSignin.pin": "4-digit PIN",
    "staffSignin.submit": "Sign in",
    "staffSignin.error": "Invalid phone number or PIN.",

    "client.signin.title": "Sign in",
    "client.signin.phone": "+998901234567",
    "client.signin.sendCode": "Send code",
    "client.signin.otp": "6-digit code",
    "client.signin.verify": "Verify",
    "client.signin.openBot": "Open the Telegram bot to link your account and receive your code.",
    "client.signin.invalidOtp": "Invalid or expired code.",
    "client.dashboard.loading": "Loading...",
    "client.dashboard.yourBalance": "Your balance",
    "client.dashboard.tierDiscount": "tier",
    "client.dashboard.pointsTo": "points to",
    "client.dashboard.showToStaff": "Show this to staff",
    "client.dashboard.recentActivity": "Recent activity",

    "lang.switcher": "Language",
  },
  ru: {
    "landing.title": "LoyaltySphere",
    "landing.description":
      "Мультитенантная платформа лояльности на базе Telegram. Никаких email и паролей для клиентов — только номер телефона и Telegram.",
    "landing.cta": "Зарегистрировать бизнес",

    "signup.title": "Регистрация бизнеса",
    "signup.name": "Полное имя",
    "signup.phone": "+998901234567",
    "signup.password": "Пароль",
    "signup.confirmPassword": "Подтвердите пароль",
    "signup.submit": "Продолжить в Telegram",
    "signup.submitting": "Отправка...",
    "signup.passwordMismatch": "Пароли не совпадают.",
    "signup.almostDone": "Почти готово!",
    "signup.confirmInTelegram": "Подтвердите номер телефона в Telegram, чтобы завершить регистрацию.",
    "signup.openTelegram": "Открыть Telegram",

    "staffSignin.title": "Вход для персонала",
    "staffSignin.phone": "+998901234567",
    "staffSignin.pin": "4-значный PIN",
    "staffSignin.submit": "Войти",
    "staffSignin.error": "Неверный номер телефона или PIN.",

    "client.signin.title": "Вход",
    "client.signin.phone": "+998901234567",
    "client.signin.sendCode": "Отправить код",
    "client.signin.otp": "6-значный код",
    "client.signin.verify": "Подтвердить",
    "client.signin.openBot": "Откройте Telegram-бота, чтобы привязать аккаунт и получить код.",
    "client.signin.invalidOtp": "Неверный или истёкший код.",
    "client.dashboard.loading": "Загрузка...",
    "client.dashboard.yourBalance": "Ваш баланс",
    "client.dashboard.tierDiscount": "уровень",
    "client.dashboard.pointsTo": "баллов до",
    "client.dashboard.showToStaff": "Покажите это сотруднику",
    "client.dashboard.recentActivity": "Последние операции",

    "lang.switcher": "Язык",
  },
  uz: {
    "landing.title": "LoyaltySphere",
    "landing.description":
      "Telegram asosidagi ko'p tarmoqli sodiqlik platformasi. Mijozlar uchun email va parol shart emas — faqat telefon raqami va Telegram.",
    "landing.cta": "Biznesingizni ro'yxatdan o'tkazing",

    "signup.title": "Biznesni ro'yxatdan o'tkazish",
    "signup.name": "To'liq ism",
    "signup.phone": "+998901234567",
    "signup.password": "Parol",
    "signup.confirmPassword": "Parolni tasdiqlang",
    "signup.submit": "Telegram orqali davom etish",
    "signup.submitting": "Yuborilmoqda...",
    "signup.passwordMismatch": "Parollar mos kelmadi.",
    "signup.almostDone": "Deyarli tayyor!",
    "signup.confirmInTelegram": "Ro'yxatdan o'tishni yakunlash uchun Telegram'da telefon raqamingizni tasdiqlang.",
    "signup.openTelegram": "Telegram'ni ochish",

    "staffSignin.title": "Xodim uchun kirish",
    "staffSignin.phone": "+998901234567",
    "staffSignin.pin": "4 xonali PIN",
    "staffSignin.submit": "Kirish",
    "staffSignin.error": "Telefon raqami yoki PIN noto'g'ri.",

    "client.signin.title": "Kirish",
    "client.signin.phone": "+998901234567",
    "client.signin.sendCode": "Kodni yuborish",
    "client.signin.otp": "6 xonali kod",
    "client.signin.verify": "Tasdiqlash",
    "client.signin.openBot": "Akkauntni bog'lash va kodni olish uchun Telegram botini oching.",
    "client.signin.invalidOtp": "Kod noto'g'ri yoki muddati o'tgan.",
    "client.dashboard.loading": "Yuklanmoqda...",
    "client.dashboard.yourBalance": "Balansingiz",
    "client.dashboard.tierDiscount": "daraja",
    "client.dashboard.pointsTo": "ballgacha:",
    "client.dashboard.showToStaff": "Buni xodimga ko'rsating",
    "client.dashboard.recentActivity": "So'nggi amallar",

    "lang.switcher": "Til",
  },
};
