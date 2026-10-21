import random
from datetime import timedelta

from sqlalchemy import update
from sqlmodel import Session, select

from .db import engine
from .models import Mission, Photo, User, now
from .security import hash_password

CREATORS = [
    ("آرش کریمی", "arash@qaab.ir", "تهران", "عکاس خیابانی، عاشق نور صبحگاهی"),
    ("نگار مرادی", "negar@qaab.ir", "اصفهان", "معماری و بافت‌های قدیمی"),
    ("سینا رستمی", "sina@qaab.ir", "شیراز", "طبیعت‌گرد و کوهنورد"),
    ("مریم اسدی", "maryam@qaab.ir", "تبریز", "عکاسی خوراک و سبک زندگی"),
    ("پویا صالحی", "pouya@qaab.ir", "مشهد", "پرتره با نور طبیعی"),
    ("الهام نوری", "elham@qaab.ir", "رشت", "رنگ، باران و جنگل"),
    ("کاوه بهرامی", "kaveh@qaab.ir", "یزد", "کویر و معماری خشت"),
    ("ترانه کاظمی", "taraneh@qaab.ir", "کیش", "دریا و سفر"),
]

TITLES = {
    "nature": [("Misty Hyrcanian Forest", "جنگل مه‌گرفته هیرکانی"), ("Alborz at Dawn", "البرز در سپیده‌دم"),
               ("Desert Stars", "ستاره‌های کویر"), ("Caspian Waves", "موج‌های خزر"),
               ("Autumn Trail", "کوره‌راه پاییزی")],
    "city": [("Tehran Blue Hour", "تهران در ساعت آبی"), ("Bazaar Alley", "کوچه‌ی بازار"),
             ("Metro Motion", "حرکت در مترو"), ("Rooftop Skyline", "خط آسمان از پشت‌بام"),
             ("Neon Rain", "باران نئونی")],
    "food": [("Saffron Rice", "پلوی زعفرانی"), ("Morning Tea", "چای صبحگاهی"),
             ("Pomegranate Table", "سفره انار"), ("Street Falafel", "فلافل خیابانی"),
             ("Bakery Steam", "بخار نانوایی")],
    "people": [("Hands of a Weaver", "دست‌های بافنده"), ("Grandmother's Smile", "لبخند مادربزرگ"),
               ("Student Portrait", "پرتره‌ی دانشجو"), ("Market Vendor", "دستفروش بازار")],
    "lifestyle": [("Home Office", "دفتر کار خانگی"), ("Weekend Cycling", "دوچرخه‌سواری آخر هفته"),
                  ("Cozy Reading", "گوشه‌ی دنج کتاب"), ("Yoga at Sunrise", "یوگا هنگام طلوع")],
    "business": [("Team Standup", "جلسه‌ی روزانه تیم"), ("Startup Desk", "میز استارتاپ"),
                 ("Coffee Meeting", "قرار کاری با قهوه"), ("Warehouse Ops", "عملیات انبار")],
    "travel": [("Qeshm Coastline", "ساحل قشم"), ("Nomad Road", "جاده‌ی عشایر"),
               ("Old Caravanserai", "کاروانسرای کهن"), ("Island Ferry", "لنج جزیره")],
    "abstract": [("Glass & Light", "شیشه و نور"), ("Gradient Dunes", "تپه‌های رنگی"),
                 ("Paper Textures", "بافت کاغذ"), ("Long Exposure Lines", "خطوط نوردهی بلند")],
}

TAGS = {"nature": "طبیعت,جنگل,کوه,nature,green", "city": "شهر,خیابان,شب,urban,city",
        "food": "غذا,خوراک,آشپزی,food,tasty", "people": "مردم,پرتره,چهره,people,portrait",
        "lifestyle": "سبک زندگی,خانه,آرامش,lifestyle", "business": "کسب‌وکار,تیم,دفتر,business",
        "travel": "سفر,جاده,دریا,travel", "abstract": "انتزاعی,رنگ,بافت,abstract"}

MISSIONS = [
    ("دیجی‌کالا", "Authentic Unboxing", "لحظه‌ی باز کردن بسته", 
     "Show the real joy of receiving a parcel at home — natural light, no studio setups.",
     "لحظه‌ی واقعی تحویل گرفتن بسته را ثبت کنید؛ نور طبیعی، بدون صحنه‌آرایی استودیویی.", 35_000_000, "lifestyle"),
    ("اسنپ‌فود", "Homemade Iranian Dishes", "غذاهای خانگی ایرانی",
     "Warm, appetizing frames of home-cooked Persian food on a real table.",
     "قاب‌های گرم و اشتهاآور از غذای خانگی ایرانی روی یک میز واقعی.", 28_000_000, "food"),
    ("ایرانسل", "Connected Everywhere", "همه‌جا متصل",
     "People using their phones in unexpected places across Iran.",
     "آدم‌هایی که در جاهای غیرمنتظره‌ی ایران از گوشی‌شان استفاده می‌کنند.", 42_000_000, "people"),
    ("علی‌بابا", "Rediscover Iran", "ایران را دوباره کشف کن",
     "Undiscovered travel spots that deserve a wider audience.",
     "مقصدهای کمترشناخته‌شده‌ای که ارزش دیده‌شدن دارند.", 50_000_000, "travel"),
    ("کافه بازار", "Makers at Work", "سازندگان در کار",
     "Behind-the-scenes of Iranian small businesses and makers.",
     "پشت‌صحنه‌ی کسب‌وکارهای کوچک و سازندگان ایرانی.", 22_000_000, "business"),
    ("دیوار", "Second Life", "زندگی دوباره",
     "Objects finding a second life — repair, reuse, resell.",
     "وسیله‌هایی که زندگی دوباره پیدا می‌کنند؛ تعمیر، استفاده‌ی دوباره، فروش.", 18_000_000, "lifestyle"),
]


def img(seed: str, w: int = 1400, h: int = 1000) -> str:
    return f"https://picsum.photos/seed/{seed}/{w}/{h}"


def lock_sample_accounts(include_demo: bool) -> None:
    """Older releases gave the sample creators (and the demo) published passwords.
    Make those accounts unusable on existing databases and end their sessions."""
    emails = [email for _, email, _, _ in CREATORS] + (["demo@qaab.ir"] if include_demo else [])
    with engine.begin() as c:
        c.execute(update(User).where(User.email.in_(emails), User.password_hash != "!")
                  .values(password_hash="!", token_version=User.token_version + 1))


def seed() -> None:
    random.seed(41)
    with Session(engine) as s:
        if s.exec(select(User)).first():
            return
        users = []
        for i, (name, email, city, bio) in enumerate(CREATORS):
            u = User(name=name, email=email, city=city, bio=bio,
                     password_hash="!",  # unusable: sample creators cannot be logged into
                     avatar=f"https://i.pravatar.cc/160?img={i + 11}",
                     balance=random.randint(2, 40) * 500_000)
            users.append(u)
            s.add(u)
        demo = User(name="کاربر نمونه", email="demo@qaab.ir", city="تهران",
                    bio="حساب نمایشی برای تست محصول", role="creator",
                    password_hash=hash_password("demo1234"),
                    avatar="https://i.pravatar.cc/160?img=5", balance=1_250_000)
        s.add(demo)
        s.commit()
        for u in users:
            s.refresh(u)
        s.refresh(demo)

        missions = []
        for i, (brand, t_en, t_fa, brief, brief_fa, reward, cat) in enumerate(MISSIONS):
            m = Mission(brand=brand, title=t_en, title_fa=t_fa, brief=brief, brief_fa=brief_fa,
                        reward=reward, category=cat, cover=img(f"mission{i}", 1600, 900),
                        brand_logo=img(f"logo{i}", 200, 200),
                        deadline=now() + timedelta(days=5 + i * 6),
                        submissions=random.randint(40, 460))
            missions.append(m)
            s.add(m)
        s.commit()
        for m in missions:
            s.refresh(m)

        n = 0
        for cat, items in TITLES.items():
            for t_en, t_fa in items:
                n += 1
                owner = random.choice(users)
                portrait = n % 3 == 0
                w, h = (1000, 1400) if portrait else (1400, 1000)
                s.add(Photo(
                    owner_id=owner.id, title=t_en, title_fa=t_fa,
                    description=f"{t_en} — captured in {owner.city}.",
                    url=img(f"qaab{n}", w, h), thumb=img(f"qaab{n}", w // 2, h // 2),
                    category=cat, tags=TAGS[cat], width=w, height=h,
                    price=random.choice([120, 190, 240, 320, 450]) * 1000,
                    likes=random.randint(12, 980), sales=random.randint(0, 64),
                    featured=n % 4 == 0,
                    mission_id=random.choice(missions).id if n % 5 == 0 else None,
                    created_at=now() - timedelta(days=random.randint(0, 120)),
                ))
        s.commit()
