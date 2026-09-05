-- RD-CRM Database Schema
-- CREATE DATABASE IF NOT EXISTS crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE crm_db;

-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    department VARCHAR(100) DEFAULT 'Sales',
    avatar_url VARCHAR(255) DEFAULT NULL,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    joined_date DATE DEFAULT (CURRENT_DATE),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role_id),
    INDEX idx_user_status (status)
) ENGINE=InnoDB;

-- 3. Companies
CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    industry VARCHAR(100),
    website VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(150),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    employee_count INT DEFAULT 0,
    annual_revenue DECIMAL(15, 2) DEFAULT 0.00,
    owner_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_company_name (name),
    INDEX idx_company_owner (owner_id)
) ENGINE=InnoDB;

-- 4. Contacts
CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    job_title VARCHAR(100),
    company_id INT NULL,
    department VARCHAR(100),
    contact_type ENUM('Decision Maker', 'Influencer', 'Evaluator', 'Executive', 'End User', 'Other') DEFAULT 'Decision Maker',
    owner_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_contact_email (email),
    INDEX idx_contact_company (company_id)
) ENGINE=InnoDB;

-- 5. Customers
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    company_id INT NULL,
    industry VARCHAR(100),
    customer_type ENUM('Individual', 'Small Business', 'Enterprise', 'Corporate') DEFAULT 'Enterprise',
    status ENUM('Active', 'Inactive', 'Potential') DEFAULT 'Active',
    owner_id INT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_customer_name (customer_name),
    INDEX idx_customer_status (status),
    INDEX idx_customer_owner (owner_id)
) ENGINE=InnoDB;

-- 6. Products / Services Catalog
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_status (status),
    INDEX idx_product_category (category)
) ENGINE=InnoDB;

-- 7. Leads
CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    company_name VARCHAR(150),
    company_id INT NULL,
    source ENUM('Website', 'Google Ads', 'Facebook', 'Instagram', 'Referral', 'Email Campaign', 'Cold Call', 'Event', 'Other') DEFAULT 'Website',
    industry VARCHAR(100),
    status ENUM('New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost') DEFAULT 'New',
    priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
    estimated_value DECIMAL(12, 2) DEFAULT 0.00,
    assigned_user_id INT NULL,
    created_by_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_lead_status (status),
    INDEX idx_lead_assigned (assigned_user_id),
    INDEX idx_lead_source (source),
    INDEX idx_lead_priority (priority),
    INDEX idx_lead_created_at (created_at)
) ENGINE=InnoDB;

-- 8. Deals
CREATE TABLE IF NOT EXISTS deals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_name VARCHAR(150) NOT NULL,
    customer_id INT NULL,
    lead_id INT NULL,
    company_id INT NULL,
    amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    stage ENUM('Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost') DEFAULT 'Qualification',
    probability INT NOT NULL DEFAULT 20,
    expected_closing_date DATE NULL,
    owner_id INT NULL,
    source VARCHAR(100) DEFAULT 'Organic',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_deal_stage (stage),
    INDEX idx_deal_owner (owner_id),
    INDEX idx_deal_close_date (expected_closing_date)
) ENGINE=InnoDB;

-- 9. Deal Items
CREATE TABLE IF NOT EXISTS deal_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    product_id INT NULL,
    product_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
    discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    INDEX idx_deal_item_deal (deal_id)
) ENGINE=InnoDB;

-- 10. Activities
CREATE TABLE IF NOT EXISTS activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_type ENUM('Call', 'Email', 'Meeting', 'Demo', 'WhatsApp', 'Other') NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT,
    lead_id INT NULL,
    customer_id INT NULL,
    deal_id INT NULL,
    assigned_user_id INT NULL,
    created_by_id INT NULL,
    activity_date DATE NOT NULL,
    activity_time TIME NULL,
    status ENUM('Planned', 'Completed', 'Cancelled') DEFAULT 'Completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_activity_assigned (assigned_user_id),
    INDEX idx_activity_date (activity_date),
    INDEX idx_activity_status (status)
) ENGINE=InnoDB;

-- 11. Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_name VARCHAR(200) NOT NULL,
    description TEXT,
    lead_id INT NULL,
    customer_id INT NULL,
    deal_id INT NULL,
    assigned_user_id INT NULL,
    created_by_id INT NULL,
    due_date DATE NOT NULL,
    priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
    status ENUM('Pending', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_task_assigned (assigned_user_id),
    INDEX idx_task_due_date (due_date),
    INDEX idx_task_status (status)
) ENGINE=InnoDB;

-- 12. Follow-ups
CREATE TABLE IF NOT EXISTS followups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    followup_date DATE NOT NULL,
    followup_time TIME NULL,
    lead_id INT NULL,
    customer_id INT NULL,
    purpose VARCHAR(255) NOT NULL,
    assigned_user_id INT NULL,
    created_by_id INT NULL,
    priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'High',
    status ENUM('Pending', 'Completed', 'Missed', 'Cancelled') DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_followup_date (followup_date),
    INDEX idx_followup_assigned (assigned_user_id),
    INDEX idx_followup_status (status)
) ENGINE=InnoDB;

-- 13. Notes
CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type ENUM('lead', 'customer', 'company', 'contact', 'deal') NOT NULL,
    entity_id INT NOT NULL,
    content TEXT NOT NULL,
    created_by_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_note_entity (entity_type, entity_id)
) ENGINE=InnoDB;

-- 14. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    entity_type VARCHAR(50) NULL,
    entity_id INT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notification_user (user_id, is_read)
) ENGINE=InnoDB;

-- 15. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    record_id INT NULL,
    old_value JSON NULL,
    new_value JSON NULL,
    ip_address VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_module (module),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_created_at (created_at)
) ENGINE=InnoDB;
