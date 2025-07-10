
import streamlit as st
import pandas as pd
import plotly.express as px
import os

# عنوان التطبيق
st.set_page_config(page_title="IT Project Tracker (Cloud Edition)", layout="wide")
st.title("📊 IT Project Task Tracker (Cloud Edition)")

st.markdown("🔄 تم حفظ المهام في ملف Excel داخل نفس مجلد المشروع على GitHub ليتم تحميله تلقائيًا عند كل تشغيل")

# ملف التخزين
EXCEL_FILE = "IT_Project_Task_Planning_CLOUD.xlsx"

# إنشاء ملف Excel إذا لم يكن موجودًا
if not os.path.exists(EXCEL_FILE):
    df_init = pd.DataFrame(columns=["Task", "Start", "End", "Status", "Resource"])
    df_init.to_excel(EXCEL_FILE, index=False)

# تحميل البيانات
df = pd.read_excel(EXCEL_FILE)

# ✅ واجهة إدخال المهام
st.subheader("➕ Add New Task")

with st.form("task_form"):
    task = st.text_input("Task Description")
    resource = st.text_input("Task Owner")
    start_date = st.date_input("Start Date")
    end_date = st.date_input("End Date")
    status = st.selectbox("Status", ["Not Started", "In Progress", "Completed"])
    submitted = st.form_submit_button("Add Task")

    if submitted:
        new_data = {
            "Task": task,
            "Start": pd.to_datetime(start_date),
            "End": pd.to_datetime(end_date),
            "Status": status,
            "Resource": resource
        }
        df = pd.concat([df, pd.DataFrame([new_data])], ignore_index=True)
        df.to_excel(EXCEL_FILE, index=False)
        st.success("✅ Task added successfully!")

# ✅ رسم المخطط الزمني Gantt Chart
st.subheader("📅 Project Timeline (Gantt Chart)")

try:
    # تأكد من صحة التنسيق
    df['Start'] = pd.to_datetime(df['Start'], errors='coerce')
    df['End'] = pd.to_datetime(df['End'], errors='coerce')
    df.dropna(subset=['Start', 'End'], inplace=True)

    fig = px.timeline(
        df,
        x_start="Start",
        x_end="End",
        y="Task",
        color="Resource",
        title="Project Gantt Chart"
    )
    fig.update_yaxes(autorange="reversed")
    st.plotly_chart(fig)

except Exception as e:
    st.error(f"❌ خطأ في رسم المخطط الزمني: {e}")
