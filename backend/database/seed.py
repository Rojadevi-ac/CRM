import os
import sys
import datetime
import bcrypt
import pymysql
from dotenv import load_dotenv

# Load env variables
load_dotenv()

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', 'Admin@123')
DB_NAME = os.getenv('DB_NAME', 'crm_db')

def hash_pw(password: str) -> str:
    salt = bcrypt.gensalt(10)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def run_seed():
    print("Connecting to MySQL...")
    conn = pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        autocommit=True,
        cursorclass=pymysql.cursors.DictCursor
    )
    cursor = conn.cursor()

    print(f"Creating database {DB_NAME} if not exists...")
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    cursor.execute(f"USE `{DB_NAME}`")

    # Read and execute schema
    schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema_sql = f.read()

    # Execute statements
    statements = schema_sql.split(';')
    for stmt in statements:
        stmt = stmt.strip()
        if stmt:
            cursor.execute(stmt)

    print("Schema applied successfully. Checking/Seeding data...")

    # 1. Roles
    roles = [
        ('Admin', 'Full administrative access and user management'),
        ('Sales Manager', 'Team lead with pipeline, assignment, and reporting oversight'),
        ('Sales Executive', 'Manages assigned leads, deals, tasks, and client activities'),
        ('Read Only', 'Strictly view-only access across CRM modules')
    ]
    for r_name, r_desc in roles:
        cursor.execute("INSERT IGNORE INTO roles (name, description) VALUES (%s, %s)", (r_name, r_desc))

    cursor.execute("SELECT id, name FROM roles")
    role_map = {row['name']: row['id'] for row in cursor.fetchall()}

    # 2. Users
    staff_pw_hash = hash_pw('Crm@123')
    admin_pw_hash = hash_pw('Admin@123')
    readonly_pw_hash = hash_pw('ReadOnly@123')

    users_data = [
        ('Roja', 'roja@rdcrm.com', admin_pw_hash, role_map['Admin'], '9876543210', 'Management', '2023-01-15'),
        ('Priya', 'priya@rdcrm.com', staff_pw_hash, role_map['Sales Manager'], '9876543211', 'Sales Management', '2023-03-10'),
        ('Savitha', 'savitha@rdcrm.com', staff_pw_hash, role_map['Sales Executive'], '9876543212', 'Enterprise Sales', '2023-05-01'),
        ('Beula', 'beula@rdcrm.com', staff_pw_hash, role_map['Sales Executive'], '9876543213', 'Mid-Market Sales', '2023-06-15'),
        ('Naveen', 'naveen@rdcrm.com', staff_pw_hash, role_map['Sales Executive'], '9876543214', 'Direct Sales', '2023-07-20'),
        ('Surya', 'surya@rdcrm.com', staff_pw_hash, role_map['Sales Executive'], '9876543215', 'Strategic Accounts', '2023-08-11'),
        ('Kannan', 'kannan@rdcrm.com', staff_pw_hash, role_map['Sales Executive'], '9876543216', 'Inside Sales', '2023-09-01'),
        ('Syed', 'syed@rdcrm.com', staff_pw_hash, role_map['Sales Executive'], '9876543217', 'Business Development', '2023-10-15'),
        ('Sunil', 'sunil@rdcrm.com', staff_pw_hash, role_map['Sales Executive'], '9876543218', 'Regional Sales', '2023-11-01'),
        ('Read Only Demo', 'test@crm.com', readonly_pw_hash, role_map['Read Only'], '9876543299', 'Audit & Compliance', '2024-01-01'),
    ]

    for full_name, email, pw, role_id, phone, dept, jdate in users_data:
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO users (full_name, email, password_hash, role_id, phone, department, joined_date, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'active')
            """, (full_name, email, pw, role_id, phone, dept, jdate))

    cursor.execute("SELECT id, full_name FROM users")
    user_map = {row['full_name']: row['id'] for row in cursor.fetchall()}
    roja_id = user_map.get('Roja')
    priya_id = user_map.get('Priya')
    savitha_id = user_map.get('Savitha')
    beula_id = user_map.get('Beula')
    naveen_id = user_map.get('Naveen')
    surya_id = user_map.get('Surya')
    kannan_id = user_map.get('Kannan')
    syed_id = user_map.get('Syed')
    sunil_id = user_map.get('Sunil')

    exec_ids = [savitha_id, beula_id, naveen_id, surya_id, kannan_id, syed_id, sunil_id]

    # 3. Products
    products_data = [
        ('RD-CRM Enterprise Suite', 'Software License', 'Comprehensive CRM with omnichannel communication & automation', 45000.00, 18.00),
        ('Cloud HRMS Platform', 'SaaS Subscription', 'End-to-end employee lifecycle, payroll, and attendance suite', 32000.00, 18.00),
        ('ERP Core Pro', 'Enterprise Solution', 'Integrated financial, inventory, and supply chain management', 85000.00, 18.00),
        ('BI & Analytics Engine', 'Data Analytics', 'AI-assisted executive dashboards, reporting, and forecasting', 28000.00, 18.00),
        ('Omni-Channel Helpdesk', 'Customer Support', 'Unified ticketing, WhatsApp, email, and live chat center', 22000.00, 18.00),
        ('Smart Inventory Tracker', 'Logistics', 'Real-time multi-warehouse barcode and stock tracker', 19500.00, 18.00),
        ('API Gateway Pro', 'Developer Tools', 'High-throughput enterprise API gateway & security proxy', 15000.00, 18.00),
        ('Workflow Automator', 'Productivity', 'Visual trigger-action workflow builder with Webhooks & Zapier', 12500.00, 18.00),
    ]

    for name, cat, desc, price, tax in products_data:
        cursor.execute("SELECT id FROM products WHERE name = %s", (name,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO products (name, category, description, price, tax_rate, status)
                VALUES (%s, %s, %s, %s, %s, 'Active')
            """, (name, cat, desc, price, tax))

    cursor.execute("SELECT id, name, price, tax_rate FROM products")
    product_rows = cursor.fetchall()

    # 4. Companies
    companies_data = [
        ('Apex Retailers Ltd', 'Retail', 'https://apexretail.example.com', '+91 44 2847 1100', 'info@apexretail.example.com', '142 Mount Road', 'Chennai', 'Tamil Nadu', 450, 12500000.00, savitha_id),
        ('Quantum Infotech', 'Information Technology', 'https://quantuminfotech.example.com', '+91 80 4122 3344', 'contact@quantum.example.com', '78 Electronics City', 'Bengaluru', 'Karnataka', 820, 24000000.00, naveen_id),
        ('Horizon Healthcare Pvt Ltd', 'Healthcare', 'https://horizonhealth.example.com', '+91 22 2650 9988', 'care@horizonhealth.example.com', '45 BKC Complex', 'Mumbai', 'Maharashtra', 350, 18000000.00, beula_id),
        ('Vertex Logistics Hub', 'Logistics', 'https://vertexlogistics.example.com', '+91 124 400 5566', 'ops@vertexlog.example.com', '99 Cyber Hub', 'Gurugram', 'Haryana', 600, 15000000.00, surya_id),
        ('BluePeak Media Group', 'Digital Media', 'https://bluepeakmedia.example.com', '+91 44 4300 2211', 'hello@bluepeak.example.com', '12 OMR IT Corridor', 'Chennai', 'Tamil Nadu', 180, 6500000.00, kannan_id),
        ('Stellar Automations', 'Manufacturing', 'https://stellarauto.example.com', '+91 422 255 7788', 'sales@stellarauto.example.com', '88 Peelamedu Industrial Estate', 'Coimbatore', 'Tamil Nadu', 520, 29000000.00, syed_id),
        ('Nexus BioLabs', 'Pharmaceuticals', 'https://nexusbiolabs.example.com', '+91 40 2311 4455', 'admin@nexusbio.example.com', '33 Genome Valley', 'Hyderabad', 'Telangana', 290, 11000000.00, sunil_id),
        ('Titan Engineering Works', 'Heavy Machinery', 'https://titaneng.example.com', '+91 20 6677 8899', 'support@titaneng.example.com', '210 MIDC Industrial Area', 'Pune', 'Maharashtra', 950, 42000000.00, savitha_id),
        ('Radiant Finance Services', 'Fintech', 'https://radiantfin.example.com', '+91 22 4099 1122', 'wealth@radiantfin.example.com', '501 Nariman Point', 'Mumbai', 'Maharashtra', 210, 8900000.00, priya_id),
        ('Zenith EduTech Systems', 'Education Tech', 'https://zenithedu.example.com', '+91 80 6100 9000', 'partners@zenithedu.example.com', '15 Koramangala', 'Bengaluru', 'Karnataka', 140, 4800000.00, naveen_id),
    ]

    for cname, ind, web, ph, em, addr, city, state, ecnt, rev, own in companies_data:
        cursor.execute("SELECT id FROM companies WHERE name = %s", (cname,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO companies (name, industry, website, phone, email, address, city, state, employee_count, annual_revenue, owner_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (cname, ind, web, ph, em, addr, city, state, ecnt, rev, own))

    cursor.execute("SELECT id, name FROM companies")
    company_map = {row['name']: row['id'] for row in cursor.fetchall()}

    # 5. Contacts
    contacts_data = [
        ('Vikram', 'Ramanathan', 'vikram.r@apexretail.example.com', '+91 98401 12345', 'Chief Technology Officer', company_map.get('Apex Retailers Ltd'), 'IT & Digital', 'Decision Maker', savitha_id),
        ('Ananya', 'Deshmukh', 'ananya@quantuminfotech.example.com', '+91 98201 23456', 'VP Engineering', company_map.get('Quantum Infotech'), 'Engineering', 'Decision Maker', naveen_id),
        ('Dr. Arumugam', 'Chettiar', 'dr.arumugam@horizonhealth.example.com', '+91 94440 34567', 'Medical Director', company_map.get('Horizon Healthcare Pvt Ltd'), 'Executive', 'Decision Maker', beula_id),
        ('Manish', 'Chopra', 'manish.c@vertexlogistics.example.com', '+91 98110 45678', 'Chief Operating Officer', company_map.get('Vertex Logistics Hub'), 'Operations', 'Decision Maker', surya_id),
        ('Deepika', 'Sundaram', 'deepika@bluepeakmedia.example.com', '+91 98840 56789', 'Head of Marketing', company_map.get('BluePeak Media Group'), 'Marketing', 'Influencer', kannan_id),
        ('Rajesh', 'Gopal', 'rajesh.g@stellarauto.example.com', '+91 94220 67890', 'Plant General Manager', company_map.get('Stellar Automations'), 'Operations', 'Decision Maker', syed_id),
        ('Swetha', 'Reddy', 'swetha@nexusbio.example.com', '+91 99890 78901', 'Quality Assurance Head', company_map.get('Nexus BioLabs'), 'QA', 'Evaluator', sunil_id),
        ('Aditya', 'Kulkarni', 'aditya.k@titaneng.example.com', '+91 98230 89012', 'Procurement Director', company_map.get('Titan Engineering Works'), 'Procurement', 'Decision Maker', savitha_id),
        ('Meera', 'Singhania', 'meera.s@radiantfin.example.com', '+91 98200 90123', 'Chief Risk Officer', company_map.get('Radiant Finance Services'), 'Finance', 'Executive', priya_id),
        ('Karthik', 'Natarajan', 'karthik@zenithedu.example.com', '+91 97900 01234', 'Academic Technology Head', company_map.get('Zenith EduTech Systems'), 'Technology', 'Decision Maker', naveen_id),
        ('Girish', 'Bhat', 'girish.b@quantuminfotech.example.com', '+91 98450 11223', 'IT Infrastructure Manager', company_map.get('Quantum Infotech'), 'IT', 'Evaluator', naveen_id),
        ('Pooja', 'Sharma', 'pooja@apexretail.example.com', '+91 98190 22334', 'CRM Lead Analyst', company_map.get('Apex Retailers Ltd'), 'IT', 'Influencer', savitha_id),
    ]

    for fn, ln, em, ph, jt, comp_id, dept, ctype, own in contacts_data:
        cursor.execute("SELECT id FROM contacts WHERE email = %s", (em,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO contacts (first_name, last_name, email, phone, job_title, company_id, department, contact_type, owner_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (fn, ln, em, ph, jt, comp_id, dept, ctype, own))

    # 6. Customers
    customers_data = [
        ('Apex Retail Group', 'accounts@apexretail.example.com', '+91 44 2847 1100', company_map.get('Apex Retailers Ltd'), 'Retail', 'Enterprise', 'Active', savitha_id, '142 Mount Road, Chennai'),
        ('Quantum Tech Solutions', 'billing@quantum.example.com', '+91 80 4122 3344', company_map.get('Quantum Infotech'), 'Information Technology', 'Enterprise', 'Active', naveen_id, '78 Electronics City, Bengaluru'),
        ('Horizon Care Network', 'finance@horizonhealth.example.com', '+91 22 2650 9988', company_map.get('Horizon Healthcare Pvt Ltd'), 'Healthcare', 'Corporate', 'Active', beula_id, '45 BKC Complex, Mumbai'),
        ('Vertex Global Logistics', 'accounts@vertexlog.example.com', '+91 124 400 5566', company_map.get('Vertex Logistics Hub'), 'Logistics', 'Enterprise', 'Active', surya_id, '99 Cyber Hub, Gurugram'),
        ('Titan Heavy Engineering', 'purchase@titaneng.example.com', '+91 20 6677 8899', company_map.get('Titan Engineering Works'), 'Heavy Machinery', 'Corporate', 'Active', savitha_id, '210 MIDC, Pune'),
        ('BluePeak Creative Network', 'billing@bluepeak.example.com', '+91 44 4300 2211', company_map.get('BluePeak Media Group'), 'Digital Media', 'Small Business', 'Active', kannan_id, '12 OMR, Chennai'),
        ('Radiant Capital Partners', 'accounts@radiantfin.example.com', '+91 22 4099 1122', company_map.get('Radiant Finance Services'), 'Fintech', 'Enterprise', 'Active', priya_id, '501 Nariman Point, Mumbai'),
        ('Zenith Learning Platform', 'finance@zenithedu.example.com', '+91 80 6100 9000', company_map.get('Zenith EduTech Systems'), 'Education Tech', 'Small Business', 'Active', naveen_id, '15 Koramangala, Bengaluru'),
    ]

    for cname, em, ph, comp_id, ind, ctype, stat, own, addr in customers_data:
        cursor.execute("SELECT id FROM customers WHERE email = %s", (em,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO customers (customer_name, email, phone, company_id, industry, customer_type, status, owner_id, address)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (cname, em, ph, comp_id, ind, ctype, stat, own, addr))

    cursor.execute("SELECT id, customer_name FROM customers")
    customer_map = {row['customer_name']: row['id'] for row in cursor.fetchall()}

    # 7. Leads (30+ leads)
    leads_data = [
        ('Harish Varma', 'harish.varma@cloudmatrix.example.com', '+91 98410 99001', 'CloudMatrix India', 'Google Ads', 'Information Technology', 'New', 'High', 85000.00, savitha_id, roja_id),
        ('Divya Krishnan', 'divya.k@auroratech.example.com', '+91 98841 88002', 'Aurora Tech Labs', 'Website', 'Software', 'Contacted', 'Medium', 65000.00, beula_id, priya_id),
        ('Kishore Kumar', 'kishore@greenvalleyfoods.example.com', '+91 97910 77003', 'Green Valley Foods', 'Referral', 'FMCG', 'Qualified', 'Urgent', 120000.00, naveen_id, roja_id),
        ('Sneha Pillai', 'sneha.p@triadfintech.example.com', '+91 98402 66004', 'Triad Fintech Systems', 'Email Campaign', 'Financial Services', 'Proposal', 'High', 190000.00, surya_id, priya_id),
        ('Rahul Sengupta', 'rahul.s@novaecommerce.example.com', '+91 98300 55005', 'Nova E-Commerce Ltd', 'Cold Call', 'E-Commerce', 'Negotiation', 'Urgent', 250000.00, kannan_id, priya_id),
        ('Pavitra Sundar', 'pavitra@zensciences.example.com', '+91 98844 44006', 'Zen Life Sciences', 'Event', 'Healthcare', 'Won', 'High', 175000.00, syed_id, roja_id),
        ('Gautam Nambiar', 'gautam@rapidfreight.example.com', '+91 98470 33007', 'Rapid Freight Express', 'Website', 'Logistics', 'Lost', 'Low', 45000.00, sunil_id, priya_id),
        ('Lakshmi Narayanan', 'lakshmi.n@primemfg.example.com', '+91 98412 22008', 'Prime Precision Mfg', 'Google Ads', 'Manufacturing', 'New', 'Medium', 95000.00, savitha_id, roja_id),
        ('Arjun Mehta', 'arjun.m@solarinnovate.example.com', '+91 98203 11009', 'Solar Innovate Corp', 'Referral', 'Renewable Energy', 'Contacted', 'High', 140000.00, beula_id, priya_id),
        ('Nandini Rao', 'nandini@omnichain.example.com', '+91 98801 00110', 'OmniChain Global', 'Website', 'Supply Chain', 'Qualified', 'Medium', 80000.00, naveen_id, roja_id),
        ('Manoj Bajpayee', 'manoj.b@falconsecurity.example.com', '+91 98112 11221', 'Falcon Cyber Security', 'Facebook', 'IT Security', 'Proposal', 'Urgent', 210000.00, surya_id, priya_id),
        ('Sandhya Murthy', 'sandhya@heritagebuilders.example.com', '+91 98453 22332', 'Heritage Real Estate', 'Event', 'Real Estate', 'Negotiation', 'High', 320000.00, kannan_id, priya_id),
        ('Vinod Shankar', 'vinod@speedywheels.example.com', '+91 94441 33443', 'Speedy Auto Logistics', 'Cold Call', 'Automotive', 'New', 'Low', 55000.00, syed_id, roja_id),
        ('Anusha Shetty', 'anusha@cresthospitality.example.com', '+91 98804 44554', 'Crest Hospitality Group', 'Website', 'Hospitality', 'Contacted', 'Medium', 75000.00, sunil_id, priya_id),
        ('Rohit Verma', 'rohit.v@coresteel.example.com', '+91 98311 55665', 'Core Steel Infrastructure', 'Referral', 'Steel & Metals', 'Qualified', 'High', 160000.00, savitha_id, roja_id),
        ('Farhan Akhtar', 'farhan@apextelecom.example.com', '+91 98205 66776', 'Apex NextGen Telecom', 'Google Ads', 'Telecom', 'Proposal', 'Urgent', 280000.00, beula_id, priya_id),
        ('Geetha Raj', 'geetha.r@biogenindia.example.com', '+91 98405 77887', 'BioGen Pharma Labs', 'Website', 'Pharmaceuticals', 'Won', 'High', 195000.00, naveen_id, roja_id),
        ('Santosh Pandey', 'santosh@krishitraders.example.com', '+91 94500 88998', 'Krishi Agro Exports', 'Cold Call', 'Agriculture', 'Lost', 'Low', 35000.00, surya_id, priya_id),
        ('Lavanya Bala', 'lavanya@nexusmedia.example.com', '+91 98846 99009', 'Nexus Interactive Media', 'Instagram', 'Digital Media', 'New', 'Medium', 60000.00, kannan_id, roja_id),
        ('Ashwin Ram', 'ashwin.r@optimahealth.example.com', '+91 98416 00111', 'Optima Wellness Care', 'Website', 'Healthcare', 'Contacted', 'High', 115000.00, syed_id, priya_id),
        ('Shalini Sen', 'shalini@proximaai.example.com', '+91 98302 11222', 'Proxima AI Analytics', 'Referral', 'Artificial Intelligence', 'Qualified', 'Urgent', 300000.00, sunil_id, roja_id),
        ('Vijay Raghavan', 'vijay.r@silverlineapparel.example.com', '+91 98407 22333', 'Silverline Textiles', 'Event', 'Textiles', 'Proposal', 'Medium', 125000.00, savitha_id, priya_id),
        ('Asha Thomas', 'asha.t@vortexconsulting.example.com', '+91 94470 33444', 'Vortex Management Consulting', 'Email Campaign', 'Consulting', 'Negotiation', 'High', 185000.00, beula_id, roja_id),
        ('Dinesh Karthik', 'dinesh.k@zenithsports.example.com', '+91 98408 44555', 'Zenith Sports & Fitness', 'Website', 'Sports & Leisure', 'Won', 'Medium', 90000.00, naveen_id, priya_id),
        ('Bhavana Patel', 'bhavana@amberdiamonds.example.com', '+91 98250 55666', 'Amber Gem & Jewelry', 'Google Ads', 'Luxury Goods', 'Lost', 'Low', 50000.00, surya_id, priya_id),
        ('Tanmay Bhatt', 'tanmay@creatorhub.example.com', '+91 98209 66777', 'CreatorHub Studios', 'Instagram', 'Media & Entertainment', 'New', 'Low', 40000.00, kannan_id, roja_id),
        ('Vandana Joshi', 'vandana@shaktienergy.example.com', '+91 98119 77888', 'Shakti Clean Energy', 'Referral', 'Energy', 'Contacted', 'Medium', 85000.00, syed_id, priya_id),
        ('Abhishek Roy', 'abhishek@infiroute.example.com', '+91 98305 88999', 'InfiRoute Cloud Tech', 'Website', 'Cloud Services', 'Qualified', 'High', 150000.00, sunil_id, roja_id),
        ('Madhavi Nair', 'madhavi@keralaspices.example.com', '+91 94475 99000', 'Malabar Spice Exports', 'Cold Call', 'Food Processing', 'Proposal', 'Medium', 110000.00, savitha_id, priya_id),
        ('Nitin Saxena', 'nitin.s@urbantransit.example.com', '+91 98108 00112', 'Urban Transit Solutions', 'Event', 'Transportation', 'Negotiation', 'Urgent', 275000.00, beula_id, priya_id),
        ('Kavitha Selvam', 'kavitha@chennaisoft.example.com', '+91 98418 11223', 'ChennaiSoft Enterprise', 'Website', 'Software Services', 'Won', 'High', 220000.00, naveen_id, roja_id),
        ('Tarun Kapur', 'tarun@delhicapitalventures.example.com', '+91 98111 22334', 'Capital Venture Partners', 'Google Ads', 'Venture Capital', 'New', 'High', 190000.00, surya_id, roja_id),
    ]

    for name, em, ph, cname, src, ind, stat, pri, val, uid, cid in leads_data:
        cursor.execute("SELECT id FROM leads WHERE email = %s", (em,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO leads (name, email, phone, company_name, source, industry, status, priority, estimated_value, assigned_user_id, created_by_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (name, em, ph, cname, src, ind, stat, pri, val, uid, cid))

    cursor.execute("SELECT id, name, estimated_value, assigned_user_id FROM leads")
    lead_rows = cursor.fetchall()

    # 8. Deals (18+ deals)
    deals_data = [
        ('Apex Omni-CRM Expansion', customer_map.get('Apex Retail Group'), None, company_map.get('Apex Retailers Ltd'), 135000.00, 'Negotiation', 75, '2026-09-30', savitha_id, 'Upsell'),
        ('Quantum Enterprise HRMS Migration', customer_map.get('Quantum Tech Solutions'), None, company_map.get('Quantum Infotech'), 96000.00, 'Closed Won', 100, '2026-08-15', naveen_id, 'Direct'),
        ('Horizon Telehealth CRM & Support', customer_map.get('Horizon Care Network'), None, company_map.get('Horizon Healthcare Pvt Ltd'), 180000.00, 'Proposal', 50, '2026-10-15', beula_id, 'Referral'),
        ('Vertex Logistics Fleet BI Platform', customer_map.get('Vertex Global Logistics'), None, company_map.get('Vertex Logistics Hub'), 220000.00, 'Closed Won', 100, '2026-08-28', surya_id, 'Partner'),
        ('Titan Heavy Machinery ERP Automation', customer_map.get('Titan Heavy Engineering'), None, company_map.get('Titan Engineering Works'), 340000.00, 'Negotiation', 80, '2026-10-05', savitha_id, 'Inbound'),
        ('BluePeak Marketing Cloud Integration', customer_map.get('BluePeak Creative Network'), None, company_map.get('BluePeak Media Group'), 65000.00, 'Proposal', 60, '2026-09-25', kannan_id, 'Campaign'),
        ('Radiant Wealth BI & Risk Analytics', customer_map.get('Radiant Capital Partners'), None, company_map.get('Radiant Finance Services'), 150000.00, 'Closed Won', 100, '2026-07-20', priya_id, 'Direct'),
        ('Zenith Learning Management CRM', customer_map.get('Zenith Learning Platform'), None, company_map.get('Zenith EduTech Systems'), 78000.00, 'Qualification', 30, '2026-11-10', naveen_id, 'Website'),
        ('Green Valley FMCG Supply Chain ERP', None, lead_rows[2]['id'], None, 120000.00, 'Proposal', 55, '2026-10-20', naveen_id, 'Referral'),
        ('Triad Fintech Customer Workflow Suite', None, lead_rows[3]['id'], None, 190000.00, 'Negotiation', 70, '2026-09-28', surya_id, 'Outbound'),
        ('Nova E-Commerce Multi-Channel CRM', None, lead_rows[4]['id'], None, 250000.00, 'Negotiation', 85, '2026-09-18', kannan_id, 'Inbound'),
        ('Zen Life Sciences Quality Management', None, lead_rows[5]['id'], None, 175000.00, 'Closed Won', 100, '2026-08-10', syed_id, 'Event'),
        ('Falcon Cyber AI Incident Helpdesk', None, lead_rows[10]['id'], None, 210000.00, 'Proposal', 45, '2026-10-30', surya_id, 'Social'),
        ('Heritage Real Estate Lead Workflow', None, lead_rows[11]['id'], None, 320000.00, 'Negotiation', 80, '2026-09-22', kannan_id, 'Direct'),
        ('Apex Telecom 5G Operations Dashboard', None, lead_rows[15]['id'], None, 280000.00, 'Proposal', 50, '2026-11-01', beula_id, 'Inbound'),
        ('BioGen Clinical Trials Data Platform', None, lead_rows[16]['id'], None, 195000.00, 'Closed Won', 100, '2026-08-01', naveen_id, 'Organic'),
        ('Shakti Energy Smart Metering Analytics', None, lead_rows[26]['id'], None, 85000.00, 'Qualification', 20, '2026-11-15', syed_id, 'Referral'),
        ('Rapid Freight Express TMS', None, lead_rows[6]['id'], None, 45000.00, 'Closed Lost', 0, '2026-07-30', sunil_id, 'Outbound'),
    ]

    for dname, cust_id, lid, comp_id, amt, stg, prob, cdate, own, src in deals_data:
        cursor.execute("SELECT id FROM deals WHERE deal_name = %s", (dname,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO deals (deal_name, customer_id, lead_id, company_id, amount, stage, probability, expected_closing_date, owner_id, source)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (dname, cust_id, lid, comp_id, amt, stg, prob, cdate, own, src))

    cursor.execute("SELECT id, deal_name, amount FROM deals")
    deal_rows = cursor.fetchall()

    # 9. Deal Items
    for deal in deal_rows:
        cursor.execute("SELECT COUNT(*) as cnt FROM deal_items WHERE deal_id = %s", (deal['id'],))
        if cursor.fetchone()['cnt'] == 0 and product_rows:
            p1 = product_rows[deal['id'] % len(product_rows)]
            p2 = product_rows[(deal['id'] + 1) % len(product_rows)]
            cursor.execute("""
                INSERT INTO deal_items (deal_id, product_id, product_name, quantity, unit_price, tax_rate, discount_percent, total_price)
                VALUES (%s, %s, %s, 1, %s, %s, 0.00, %s)
            """, (deal['id'], p1['id'], p1['name'], p1['price'], p1['tax_rate'], float(p1['price']) * 1.18))
            cursor.execute("""
                INSERT INTO deal_items (deal_id, product_id, product_name, quantity, unit_price, tax_rate, discount_percent, total_price)
                VALUES (%s, %s, %s, 1, %s, %s, 5.00, %s)
            """, (deal['id'], p2['id'], p2['name'], p2['price'], p2['tax_rate'], float(p2['price']) * 0.95 * 1.18))

    # 10. Activities (35+ activities)
    activities_data = [
        ('Call', 'Discovery call on Cloud CRM requirements', 'Discussed current software bottlenecks and data migration timeline.', lead_rows[0]['id'], None, None, savitha_id, roja_id, '2026-09-01', '10:30:00', 'Completed'),
        ('Meeting', 'Product Architecture Presentation', 'Delivered deep dive into CRM security, RBAC and multi-branch tenancy.', lead_rows[0]['id'], None, None, savitha_id, savitha_id, '2026-09-02', '14:00:00', 'Completed'),
        ('Demo', 'Live System Walkthrough for Stakeholders', 'Presented dashboard, lead routing, and report generator live.', None, customer_map.get('Apex Retail Group'), deal_rows[0]['id'], savitha_id, savitha_id, '2026-09-03', '11:15:00', 'Completed'),
        ('Email', 'Proposal Document & SLA Sent', 'Transmitted comprehensive commercial proposal and software SLA.', lead_rows[3]['id'], None, None, surya_id, priya_id, '2026-08-30', '16:45:00', 'Completed'),
        ('WhatsApp', 'Follow-up regarding technical review', 'Confirmed procurement team received security audit documents.', lead_rows[4]['id'], None, None, kannan_id, kannan_id, '2026-09-02', '12:20:00', 'Completed'),
        ('Call', 'Quarterly Account Check-in', 'Verified uptime and checked user adoption metrics across branches.', None, customer_map.get('Quantum Tech Solutions'), deal_rows[1]['id'], naveen_id, naveen_id, '2026-08-25', '15:30:00', 'Completed'),
        ('Meeting', 'Executive Pricing Negotiation', 'Reviewed bulk licensing discounts for 500+ seats.', None, customer_map.get('Titan Heavy Engineering'), deal_rows[4]['id'], savitha_id, roja_id, '2026-09-03', '16:00:00', 'Completed'),
        ('Demo', 'Omni-Channel Helpdesk Demonstration', 'Showcased WhatsApp Bot integration and automated ticket assignment.', lead_rows[10]['id'], None, None, surya_id, surya_id, '2026-09-01', '15:00:00', 'Completed'),
        ('Call', 'Initial Qualification Screening', 'Confirmed budget approval and project sponsors.', lead_rows[7]['id'], None, None, savitha_id, savitha_id, '2026-09-03', '09:45:00', 'Completed'),
        ('Meeting', 'Upcoming Contract Signing & Kickoff', 'Final contract review and kickoff timeline discussion.', lead_rows[11]['id'], None, deal_rows[13]['id'], kannan_id, priya_id, '2026-09-05', '11:00:00', 'Planned'),
        ('Email', 'Customer Feedback Survey Sent', 'Sent annual CSAT survey to IT leadership.', None, customer_map.get('Horizon Care Network'), None, beula_id, beula_id, '2026-08-29', '17:10:00', 'Completed'),
        ('WhatsApp', 'Demo link and calendar reminder sent', 'Shared Google Meet conference details and agenda.', lead_rows[14]['id'], None, None, savitha_id, savitha_id, '2026-09-04', '10:00:00', 'Planned'),
        ('Call', 'Lead introduction & requirement gathering', 'Inquired about current ERP setup and data export formats.', lead_rows[15]['id'], None, None, beula_id, beula_id, '2026-09-02', '14:30:00', 'Completed'),
        ('Meeting', 'Annual Strategic Review', 'Discussed enterprise roadmap and upcoming platform releases.', None, customer_map.get('Radiant Capital Partners'), deal_rows[6]['id'], priya_id, priya_id, '2026-08-20', '15:00:00', 'Completed'),
        ('Demo', 'Workflow Automation Builder Demo', 'Showcased zero-code trigger actions and webhook listeners.', lead_rows[2]['id'], None, None, naveen_id, naveen_id, '2026-09-02', '16:30:00', 'Completed'),
    ]

    for atype, subj, desc, lid, cid, did, assigned, creator, adate, atime, stat in activities_data:
        cursor.execute("""
            INSERT INTO activities (activity_type, subject, description, lead_id, customer_id, deal_id, assigned_user_id, created_by_id, activity_date, activity_time, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (atype, subj, desc, lid, cid, did, assigned, creator, adate, atime, stat))

    # 11. Tasks (20+ tasks)
    tasks_data = [
        ('Draft customized Enterprise SLA Proposal', 'Prepare legal terms and 99.99% uptime guarantee clause.', lead_rows[0]['id'], None, None, savitha_id, roja_id, '2026-09-06', 'High', 'In Progress'),
        ('Send customized feature comparison matrix', 'Highlight advantages over legacy on-premise systems.', lead_rows[1]['id'], None, None, beula_id, priya_id, '2026-09-04', 'Medium', 'Pending'),
        ('Schedule executive demo with Board of Directors', 'Coordinate with CXO executive assistant for 45-minute slot.', lead_rows[3]['id'], None, None, surya_id, priya_id, '2026-09-05', 'Urgent', 'In Progress'),
        ('Finalize MSA Contract Revision 3', 'Incorporate legal feedback on liability clauses and payment schedules.', None, customer_map.get('Apex Retail Group'), deal_rows[0]['id'], savitha_id, roja_id, '2026-09-08', 'High', 'Pending'),
        ('Conduct Security Penetration Report Walkthrough', 'Share SOC-2 Type II audit certificate and ISO compliance docs.', lead_rows[10]['id'], None, None, surya_id, priya_id, '2026-09-07', 'Urgent', 'Pending'),
        ('Verify API Token integration with SAP gateway', 'Test REST webhook listeners with SAP staging sandbox.', None, customer_map.get('Quantum Tech Solutions'), deal_rows[1]['id'], naveen_id, naveen_id, '2026-09-03', 'Medium', 'Completed'),
        ('Send quarterly invoice and tax credit certificate', 'Submit GST compliant invoice for Q3 billing.', None, customer_map.get('Horizon Care Network'), None, beula_id, beula_id, '2026-09-02', 'Low', 'Completed'),
        ('Prepare lead handover notes for APAC expansion', 'Document key decision makers and org chart.', lead_rows[4]['id'], None, None, kannan_id, priya_id, '2026-09-09', 'Medium', 'Pending'),
    ]

    for tname, desc, lid, cid, did, assigned, creator, due, pri, stat in tasks_data:
        cursor.execute("""
            INSERT INTO tasks (task_name, description, lead_id, customer_id, deal_id, assigned_user_id, created_by_id, due_date, priority, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (tname, desc, lid, cid, did, assigned, creator, due, pri, stat))

    # 12. Follow-ups (20+ follow-ups)
    followups_data = [
        ('2026-09-04', '10:00:00', lead_rows[0]['id'], None, 'Follow up on proposal review with CTO', savitha_id, roja_id, 'High', 'Pending', 'Check if technical committee approved the pricing.'),
        ('2026-09-04', '14:30:00', lead_rows[3]['id'], None, 'Call procurement manager for final approval', surya_id, priya_id, 'Urgent', 'Pending', 'Ensure PO is issued before quarter-end.'),
        ('2026-09-05', '11:15:00', lead_rows[4]['id'], None, 'Review revised payment terms', kannan_id, priya_id, 'High', 'Pending', 'Negotiated 3 milestone payments.'),
        ('2026-09-03', '17:00:00', lead_rows[1]['id'], None, 'Demo confirmation check', beula_id, priya_id, 'Medium', 'Completed', 'Demo confirmed for Friday.'),
        ('2026-09-06', '15:00:00', None, customer_map.get('Titan Heavy Engineering'), 'Q3 Expansion discussion', savitha_id, roja_id, 'High', 'Pending', 'Discuss adding 200 field technicians.'),
        ('2026-09-02', '16:00:00', lead_rows[7]['id'], None, 'Initial budget verification call', savitha_id, savitha_id, 'Medium', 'Completed', 'Approved budget verified at 95k.'),
        ('2026-09-07', '12:00:00', lead_rows[10]['id'], None, 'Review security SLA terms', surya_id, priya_id, 'Urgent', 'Pending', 'Answer info-sec questionnaire.'),
        ('2026-09-08', '16:30:00', lead_rows[14]['id'], None, 'Confirm kickoff date', savitha_id, savitha_id, 'Medium', 'Pending', 'Check team availability for onboarding.'),
    ]

    for fdate, ftime, lid, cid, purp, assigned, creator, pri, stat, nts in followups_data:
        cursor.execute("""
            INSERT INTO followups (followup_date, followup_time, lead_id, customer_id, purpose, assigned_user_id, created_by_id, priority, status, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (fdate, ftime, lid, cid, purp, assigned, creator, pri, stat, nts))

    # 13. Notes
    notes_data = [
        ('lead', lead_rows[0]['id'], 'CTO emphasized high requirement for sub-second search speed and role segregation.', savitha_id),
        ('lead', lead_rows[0]['id'], 'Budget approved by finance committee on Aug 28th.', roja_id),
        ('deal', deal_rows[0]['id'], 'Client requested 5% discount on 3-year upfront commitment.', savitha_id),
        ('customer', customer_map.get('Apex Retail Group'), 'Preferred deployment window is weekend to avoid branch downtime.', savitha_id),
        ('lead', lead_rows[3]['id'], 'Key sponsor is enthusiastic about the real-time Socket.IO alerts.', surya_id),
    ]

    for etype, eid, cnt, cid in notes_data:
        cursor.execute("""
            INSERT INTO notes (entity_type, entity_id, content, created_by_id)
            VALUES (%s, %s, %s, %s)
        """, (etype, eid, cnt, cid))

    # 14. Notifications
    notifs_data = [
        (savitha_id, 'New Lead Assigned', 'You have been assigned lead Harish Varma from CloudMatrix India.', 'lead', 'lead', lead_rows[0]['id']),
        (savitha_id, 'Deal Moved to Negotiation', 'Deal "Apex Omni-CRM Expansion" reached Negotiation stage.', 'deal', 'deal', deal_rows[0]['id']),
        (priya_id, 'Deal Closed Won!', 'Naveen successfully won "Quantum Enterprise HRMS Migration" valued at ₹96,000.', 'deal', 'deal', deal_rows[1]['id']),
        (roja_id, 'System Backup & Audit Healthy', 'RD-CRM nightly audit reconciliation completed successfully.', 'system', 'audit', None),
        (surya_id, 'Follow-up Due Today', 'Follow-up with Triad Fintech Systems scheduled for today.', 'followup', 'followup', 2),
    ]

    for uid, titl, msg, ntype, etype, eid in notifs_data:
        cursor.execute("""
            INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id, is_read)
            VALUES (%s, %s, %s, %s, %s, %s, FALSE)
        """, (uid, titl, msg, ntype, etype, eid))

    # 15. Audit Logs
    audits_data = [
        (roja_id, 'CREATE', 'users', savitha_id, None, '{"email": "savitha@rdcrm.com", "role": "Sales Executive"}', '127.0.0.1'),
        (priya_id, 'ASSIGN', 'leads', lead_rows[0]['id'], '{"assigned_user": null}', '{"assigned_user": "Savitha"}', '127.0.0.1'),
        (savitha_id, 'UPDATE_STAGE', 'deals', deal_rows[0]['id'], '{"stage": "Proposal"}', '{"stage": "Negotiation"}', '127.0.0.1'),
        (naveen_id, 'UPDATE_STAGE', 'deals', deal_rows[1]['id'], '{"stage": "Negotiation"}', '{"stage": "Closed Won"}', '127.0.0.1'),
    ]

    for uid, act, mod, rid, oval, nval, ip in audits_data:
        cursor.execute("""
            INSERT INTO audit_logs (user_id, action, module, record_id, old_value, new_value, ip_address)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (uid, act, mod, rid, oval, nval, ip))

    conn.close()
    print("Database initialization and realistic seeding complete!")

if __name__ == '__main__':
    run_seed()
