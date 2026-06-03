import os
import joblib
import shap
import pandas as pd

_BASE = os.path.dirname(__file__)

pipeline = joblib.load(os.path.join(_BASE, "model.pkl"))
features: list[str] = joblib.load(os.path.join(_BASE, "features.pkl"))
RISK_THRESHOLD = joblib.load(os.path.join(_BASE, "threshold.pkl"))
model = pipeline.named_steps["model"]
preprocessor = pipeline.named_steps["preprocessor"]

_explainer = shap.TreeExplainer(model)

_INTERVENTIONS: dict[str, str] = {
    "failures": (
        "The student has a history of repeated course failures, which is the strongest predictor of continued struggle. "
        "Schedule bi-weekly academic check-ins with a faculty advisor and arrange targeted tutoring in the subjects where failures occurred. "
        "Setting clear, short-term academic milestones can help rebuild the student's confidence and prevent further setbacks."
    ),
    "absences": (
        "Chronic absenteeism is significantly increasing this student's risk, as missed classes compound quickly into unrecoverable knowledge gaps. "
        "Implement a structured attendance monitoring plan and assign a staff contact to reach out after each unexplained absence. "
        "A conversation with the student's family is recommended to identify whether the absences are driven by health, transport, or motivational factors."
    ),
    "studytime": (
        "This student is spending very little time on independent study, which is undermining their ability to keep pace with coursework. "
        "Work with the student to create a realistic weekly study schedule and connect them with supervised study halls or peer study groups. "
        "Even a modest increase in structured study time has been shown to significantly improve outcomes for at-risk learners."
    ),
    "Dalc": (
        "Elevated weekday alcohol consumption is a significant factor in this student's risk profile, likely affecting concentration, attendance, and motivation. "
        "A confidential one-on-one session with a school counsellor is strongly recommended to explore underlying stressors and discuss healthier coping strategies. "
        "Early intervention at this stage can prevent the behaviour from escalating and causing irreversible academic damage."
    ),
    "Walc": (
        "High weekend alcohol use is contributing meaningfully to this student's at-risk classification and may signal broader social or emotional pressures. "
        "Engage the student in a non-judgmental conversation about their weekend routines and introduce them to extracurricular activities that provide positive social outlets. "
        "Peer mentorship programmes have shown particular effectiveness in redirecting social habits for students in this pattern."
    ),
    "goout": (
        "Frequent socialising outside school is pulling time and energy away from this student's academic engagement. "
        "An advisor should help the student reflect on how they balance social commitments against study obligations and set concrete weekly priorities. "
        "Connecting social participation to academic goals — for example, group study sessions — can channel this social energy productively."
    ),
    "famrel": (
        "Poor family relationships are creating an unstable home environment that is hampering this student's ability to focus and stay motivated. "
        "Connect the student with a school counsellor who can provide a safe space to process these difficulties and build resilience. "
        "Consider whether additional in-school support time — such as a quiet study room or after-school programme — can partially offset the lack of a settled home base."
    ),
    "freetime": (
        "An excess of unstructured free time is correlating with disengagement and lower academic output for this student. "
        "Encourage enrolment in structured extracurricular activities that align with the student's interests to fill this time productively. "
        "Regular progress reviews with a form tutor can help the student develop stronger self-management habits over the coming term."
    ),
    "health": (
        "Poor self-reported health is a meaningful contributor to this student's risk and may be causing both absences and reduced concentration in class. "
        "Refer the student to school health services for an assessment and explore whether any reasonable accommodations — such as flexible deadlines or a reduced timetable — are warranted. "
        "Ensuring the student feels supported rather than penalised for health challenges is key to keeping them engaged."
    ),
    "Medu": (
        "Lower maternal education levels suggest the student may have limited academic support and guidance available at home. "
        "Prioritise connecting this student with in-school mentoring and ensure they know how to access homework support resources independently. "
        "Regular teacher check-ins can compensate for the reduced home-based academic scaffolding and help catch difficulties early."
    ),
    "Fedu": (
        "Lower paternal education is a background factor indicating the student may lack strong academic role models or study guidance at home. "
        "Offer take-home learning packs and invite the family to a short workshop on how to support their child's study routine. "
        "Strengthening the school-family communication channel will help ensure the student receives consistent encouragement from both environments."
    ),
    "age": (
        "The student's age relative to their cohort is flagged as a contributing risk factor, which may reflect grade repetition or delayed enrolment. "
        "A senior tutor should review the student's full academic history to understand the root cause and tailor support accordingly. "
        "Peer mentoring with a slightly older, high-performing student can also help build confidence and a sense of belonging."
    ),
}


def _build_intervention(top_features: list[str]) -> str:
    for feat in top_features:
        if feat in _INTERVENTIONS:
            return _INTERVENTIONS[feat]
    return (
        "This student shows several compounding risk factors that together are elevating their likelihood of academic failure. "
        "A holistic review meeting involving the student, a faculty advisor, and a counsellor is recommended to agree on a coordinated support plan. "
        "Progress should be reviewed fortnightly to ensure interventions are having the intended effect."
    )


def predict_student(student_data: dict) -> dict:
    df = pd.DataFrame([student_data])[features]

    risk_score = float(pipeline.predict_proba(df)[0, 1])
    at_risk_flag = risk_score >= RISK_THRESHOLD

    medium_threshold = min(0.7, RISK_THRESHOLD + 0.3)
    if risk_score < RISK_THRESHOLD:
        risk_label = "low"
    elif risk_score <= medium_threshold:
        risk_label = "medium"
    else:
        risk_label = "high"

    shap_vals = _explainer.shap_values(preprocessor.transform(df))[0]
    shap_dict = {feat: float(val) for feat, val in zip(features, shap_vals)}

    top_features = sorted(shap_dict, key=lambda f: abs(shap_dict[f]), reverse=True)[:3]
    intervention_plan = _build_intervention(top_features)

    return {
        "risk_score": risk_score,
        "risk_label": risk_label,
        "at_risk": at_risk_flag,
        "risk_threshold": float(RISK_THRESHOLD),
        "shap_values": shap_dict,
        "intervention_plan": intervention_plan,
    }
