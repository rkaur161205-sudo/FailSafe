import csv
import random
import os

random.seed(42)

MALE_NAMES = [
    "Aarav Sharma", "Arjun Singh", "Vikram Patel", "Rohan Gupta", "Karan Mehta",
    "Rahul Verma", "Amit Kumar", "Siddharth Joshi", "Nikhil Rao", "Pranav Nair",
    "Kabir Malhotra", "Ishaan Chopra", "Dev Saxena", "Ayaan Khan", "Rishi Iyer",
    "Harsh Agarwal", "Yash Bhatia", "Ankit Mishra", "Varun Tiwari", "Mohit Reddy",
    "Dhruv Pandey", "Kunal Desai", "Akash Pillai", "Tarun Kapoor", "Shivam Sinha",
    "Parth Choudhary", "Rishabh Dubey", "Samarth Jain", "Neel Ghosh", "Omkar Patil",
]

FEMALE_NAMES = [
    "Aadhya Sharma", "Ananya Singh", "Priya Patel", "Sneha Gupta", "Kavya Mehta",
    "Riya Verma", "Pooja Nair", "Diya Joshi", "Shreya Rao", "Naina Malhotra",
    "Aisha Khan", "Tanya Iyer", "Mehak Chopra", "Simran Saxena", "Ishita Agarwal",
    "Palak Bhatia", "Kriti Mishra", "Aditi Tiwari", "Sanya Reddy", "Tanvi Pandey",
    "Ritika Desai", "Bhavna Kapoor", "Jiya Pillai", "Swati Sinha", "Nidhi Choudhary",
]

all_names = MALE_NAMES + FEMALE_NAMES
random.shuffle(all_names)
names = all_names[:55]

rows = []
for i in range(55):
    student_id = f"S{i+1:03d}"
    name = names[i]
    sex = "M" if name in MALE_NAMES else "F"
    school = random.choice(["GP", "MS"])
    address = random.choice(["U", "R"])
    famsize = random.choice(["GT3", "LE3"])
    Pstatus = random.choice(["T", "A"])
    age = random.randint(15, 19)
    Medu = random.randint(0, 4)
    Fedu = random.randint(0, 4)
    Mjob = random.choice(["at_home", "health", "services", "teacher", "other"])
    Fjob = random.choice(["at_home", "health", "services", "teacher", "other"])
    reason = random.choice(["home", "reputation", "course", "other"])
    guardian = random.choice(["mother", "father", "other"])
    traveltime = random.randint(1, 4)
    studytime = random.randint(1, 4)
    failures = random.choices([0, 1, 2, 3], weights=[65, 20, 10, 5])[0]
    schoolsup = random.choice(["yes", "no"])
    famsup = random.choice(["yes", "no"])
    paid = random.choice(["yes", "no"])
    activities = random.choice(["yes", "no"])
    nursery = random.choice(["yes", "no"])
    higher = random.choice(["yes", "no"])
    internet = random.choice(["yes", "no"])
    romantic = random.choice(["yes", "no"])
    famrel = random.randint(1, 5)
    freetime = random.randint(1, 5)
    goout = random.randint(1, 5)
    Dalc = random.randint(1, 5)
    Walc = random.randint(1, 5)
    health = random.randint(1, 5)
    absences = random.randint(0, 25)

    base_grade = random.randint(8, 20)
    G1 = max(0, min(20, base_grade + random.randint(-3, 3) - failures - absences // 10))
    G2 = max(0, min(20, G1 + random.randint(-2, 2)))
    G3 = max(0, min(20, G2 + random.randint(-2, 2)))

    rows.append([
        student_id, name, school, sex, age, address, famsize, Pstatus,
        Medu, Fedu, Mjob, Fjob, reason, guardian, traveltime, studytime,
        failures, schoolsup, famsup, paid, activities, nursery, higher,
        internet, romantic, famrel, freetime, goout, Dalc, Walc, health,
        absences, G1, G2, G3,
    ])

out_path = os.path.join(os.path.dirname(__file__), "large_students.csv")
with open(out_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow([
        "student_id", "name", "school", "sex", "age", "address", "famsize", "Pstatus",
        "Medu", "Fedu", "Mjob", "Fjob", "reason", "guardian", "traveltime", "studytime",
        "failures", "schoolsup", "famsup", "paid", "activities", "nursery", "higher",
        "internet", "romantic", "famrel", "freetime", "goout", "Dalc", "Walc", "health",
        "absences", "G1", "G2", "final_grade",
    ])
    writer.writerows(rows)

print(f"Generated {len(rows)} students -> {out_path}")
