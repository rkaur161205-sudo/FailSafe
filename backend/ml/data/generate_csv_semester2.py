import csv
import random
import os

random.seed(99)  # different seed -> different values, same structure

IN_PATH  = os.path.join(os.path.dirname(__file__), "large_students.csv")
OUT_PATH = os.path.join(os.path.dirname(__file__), "large_students_semester2.csv")

with open(IN_PATH, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    original = list(reader)

rows = []
for rec in original:
    student_id = rec["student_id"]
    name = rec["name"]
    age = int(rec["age"])
    school = rec.get("school", random.choice(["GP", "MS"]))
    sex = rec.get("sex", random.choice(["M", "F"]))
    address = rec.get("address", random.choice(["U", "R"]))
    famsize = rec.get("famsize", random.choice(["GT3", "LE3"]))
    Pstatus = rec.get("Pstatus", random.choice(["T", "A"]))
    Medu = int(rec["Medu"])
    Fedu = int(rec["Fedu"])
    Mjob = rec.get("Mjob", random.choice(["at_home", "health", "services", "teacher", "other"]))
    Fjob = rec.get("Fjob", random.choice(["at_home", "health", "services", "teacher", "other"]))
    reason = rec.get("reason", random.choice(["home", "reputation", "course", "other"]))
    guardian = rec.get("guardian", random.choice(["mother", "father", "other"]))
    schoolsup = rec.get("schoolsup", random.choice(["yes", "no"]))
    famsup = rec.get("famsup", random.choice(["yes", "no"]))
    paid = rec.get("paid", random.choice(["yes", "no"]))
    activities = rec.get("activities", random.choice(["yes", "no"]))
    nursery = rec.get("nursery", random.choice(["yes", "no"]))
    higher = rec.get("higher", random.choice(["yes", "no"]))
    internet = rec.get("internet", random.choice(["yes", "no"]))
    romantic = rec.get("romantic", random.choice(["yes", "no"]))

    traveltime = int(rec.get("traveltime", random.randint(1, 4)))
    studytime = int(rec.get("studytime", random.randint(1, 4)))
    failures = max(0, min(3, int(rec.get("failures", 0))))
    goout = int(rec.get("goout", random.randint(1, 5)))
    Dalc = int(rec.get("Dalc", random.randint(1, 5)))
    Walc = int(rec.get("Walc", random.randint(1, 5)))
    health = int(rec.get("health", random.randint(1, 5)))
    famrel = int(rec.get("famrel", random.randint(1, 5)))
    freetime = int(rec.get("freetime", random.randint(1, 5)))
    absences = max(0, min(25, int(rec.get("absences", 0))))

    # Most students improve; ~20% get worse (realistic semester variance)
    improving = random.random() < 0.78

    if improving:
        absences = max(0, absences - random.randint(2, 8))
        studytime = min(4, studytime + random.randint(0, 1))
        failures = max(0, failures - random.choices([0, 1], weights=[60, 40])[0])
        goout = max(1, goout - random.randint(0, 1))
        Dalc = max(1, Dalc - random.randint(0, 1))
        Walc = max(1, Walc - random.randint(0, 1))
        health = min(5, health + random.randint(0, 1))
        famrel = min(5, famrel + random.randint(0, 1))
    else:
        absences = min(25, absences + random.randint(2, 7))
        studytime = max(1, studytime - random.randint(0, 1))
        failures = min(3, failures + random.choices([0, 1], weights=[70, 30])[0])
        goout = min(5, goout + random.randint(0, 1))
        Dalc = min(5, Dalc + random.randint(0, 1))
        Walc = min(5, Walc + random.randint(0, 1))
        health = max(1, health - random.randint(0, 1))

    base_grade = int(rec.get("G2", random.randint(8, 20)))
    G1 = int(rec.get("G1", max(0, min(20, base_grade + random.randint(-3, 3) - failures - absences // 10))))
    G2 = int(rec.get("G2", max(0, min(20, G1 + random.randint(-2, 2)))))
    G3 = max(0, min(20, G2 + random.randint(-2, 2)))

    rows.append([
        student_id, name, school, sex, age, address, famsize, Pstatus,
        Medu, Fedu, Mjob, Fjob, reason, guardian, traveltime, studytime,
        failures, schoolsup, famsup, paid, activities, nursery, higher,
        internet, romantic, famrel, freetime, goout, Dalc, Walc, health,
        absences, G1, G2, G3,
    ])

with open(OUT_PATH, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow([
        "student_id", "name", "school", "sex", "age", "address", "famsize", "Pstatus",
        "Medu", "Fedu", "Mjob", "Fjob", "reason", "guardian", "traveltime", "studytime",
        "failures", "schoolsup", "famsup", "paid", "activities", "nursery", "higher",
        "internet", "romantic", "famrel", "freetime", "goout", "Dalc", "Walc", "health",
        "absences", "G1", "G2", "final_grade",
    ])
    writer.writerows(rows)

print(f"Generated {len(rows)} students -> {OUT_PATH}")
