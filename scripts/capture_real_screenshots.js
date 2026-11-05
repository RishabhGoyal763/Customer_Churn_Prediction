const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('../frontend/node_modules/playwright-core');

const API_PORT = 8000;
const FRONTEND_PORT = 3000;

// 1. Mock API Server
const mockData = {
  '/api/v1/auth/me': { id: 1, email: 'admin@customer360.ai', full_name: 'Admin User', role: 'ADMIN', organization_id: 1, organization_name: 'Customer360 Enterprise' },
  '/api/v1/dashboard/summary': {
    total_customers: 24520,
    revenue: 1420500,
    total_orders: 48910,
    avg_order_value: 290.43,
    repeat_purchase_rate: 0.428,
    churn_rate: 0.084,
    avg_clv: 3622.4,
    at_risk_customers: 142,
    revenue_at_risk: 124500,
    currency: 'USD'
  },
  '/api/v1/analytics/rfm': {
    total_customers: 24520,
    segments: [
      { segment: 'champions', customer_count: 5820, share: 0.237 },
      { segment: 'loyal_customers', customer_count: 6410, share: 0.261 },
      { segment: 'at_risk', customer_count: 3240, share: 0.132 },
      { segment: 'hibernating', customer_count: 4120, share: 0.168 },
      { segment: 'new_customers', customer_count: 2680, share: 0.109 },
      { segment: 'potential_loyalists', customer_count: 2250, share: 0.093 }
    ]
  },
  '/api/v1/analytics/clv': {
    avg_clv: 3622.4,
    median_clv: 2850.0,
    total_clv: 1420500,
    customers: 24520,
    percentiles: { '25': 1200, '50': 2850, '75': 4900, '90': 8500 },
    buckets: [
      { label: '$0 - $1k', count: 4800 },
      { label: '$1k - $3k', count: 9600 },
      { label: '$3k - $6k', count: 6500 },
      { label: '$6k - $10k', count: 2600 },
      { label: '$10k+', count: 1020 }
    ]
  },
  '/api/v1/analytics/trends': {
    months: 6,
    items: [
      { month: '2026-05', orders: 6800, revenue: 198000, active_customers: 4800 },
      { month: '2026-06', orders: 7400, revenue: 215000, active_customers: 5200 },
      { month: '2026-07', orders: 7900, revenue: 232000, active_customers: 5500 },
      { month: '2026-08', orders: 8100, revenue: 241000, active_customers: 5750 },
      { month: '2026-09', orders: 8900, revenue: 258000, active_customers: 6100 },
      { month: '2026-10', orders: 9810, revenue: 276500, active_customers: 6520 }
    ]
  },
  '/api/v1/analytics/features-summary': {
    customers_with_features: 24520,
    buyers: 24520,
    total_customers: 24520,
    coverage: 1.0,
    dataset_version_ids: [1],
    as_of: '2026-10-19T23:00:00Z'
  },
  '/api/v1/predictions/at-risk': {
    total: 142,
    model_version_id: 3,
    min_risk_level: 'HIGH',
    median_clv: 2850,
    summary: {
      total_value_at_risk: 124500,
      by_risk_level: { CRITICAL: 38, HIGH: 104, MEDIUM: 210, LOW: 898 }
    },
    items: [
      {
        prediction_id: 101,
        customer_id: 1,
        external_customer_id: 'CUST-1049',
        name: 'Marcus Vance',
        email: 'marcus.vance@example.com',
        probability: 0.884,
        risk_level: 'CRITICAL',
        risk_category: 'PRIORITY',
        clv_est: 8420,
        value_at_risk: 7443.28
      },
      {
        prediction_id: 102,
        customer_id: 2,
        external_customer_id: 'CUST-2182',
        name: 'Global Tech Inc.',
        email: 'ops@globaltech.io',
        probability: 0.821,
        risk_level: 'HIGH',
        risk_category: 'PRIORITY',
        clv_est: 7150,
        value_at_risk: 5870.15
      },
      {
        prediction_id: 103,
        customer_id: 3,
        external_customer_id: 'CUST-3901',
        name: 'Innovate Solutions',
        email: 'contact@innovate.co',
        probability: 0.795,
        risk_level: 'HIGH',
        risk_category: 'PRIORITY',
        clv_est: 6800,
        value_at_risk: 5406.00
      },
      {
        prediction_id: 104,
        customer_id: 4,
        external_customer_id: 'CUST-4112',
        name: 'Vertex Industries',
        email: 'contact@vertex.org',
        probability: 0.762,
        risk_level: 'HIGH',
        risk_category: 'WIN_BACK',
        clv_est: 2400,
        value_at_risk: 1828.80
      },
      {
        prediction_id: 105,
        customer_id: 5,
        external_customer_id: 'CUST-5290',
        name: 'Dynamic Retail Corp',
        email: 'support@dynamicretail.biz',
        probability: 0.735,
        risk_level: 'HIGH',
        risk_category: 'WIN_BACK',
        clv_est: 2100,
        value_at_risk: 1543.50
      },
      {
        prediction_id: 106,
        customer_id: 6,
        external_customer_id: 'CUST-6891',
        name: 'Acuity Logistics',
        email: 'dispatch@acuity.net',
        probability: 0.718,
        risk_level: 'HIGH',
        risk_category: 'WIN_BACK',
        clv_est: 1950,
        value_at_risk: 1400.10
      }
    ]
  },
  '/api/v1/customers/1': {
    customer: {
      id: 1,
      external_customer_id: 'CUST-1049',
      name: 'Marcus Vance',
      email: 'marcus.vance@example.com',
      location: 'New York, USA',
      signup_date: '2024-03-15'
    },
    purchase_metrics: {
      total_orders: 18,
      total_spending: 8420,
      avg_order_value: 467.78,
      first_purchase: '2024-03-18',
      last_purchase: '2026-07-28'
    },
    rfm: {
      recency_days: 84,
      frequency: 18,
      monetary: 8420,
      rfm_score: '554',
      rfm_segment: 'champions'
    },
    behavioral: {
      aov: 467.78,
      tenure_days: 850,
      avg_days_between: 47.2,
      category_diversity: 0.82,
      discount_usage: 0.12,
      engagement_score: 0.71
    },
    value: {
      clv_est: 11500,
      value_at_risk: 8533
    },
    risk: {
      churn_probability: 0.742,
      risk_level: 'HIGH',
      risk_category: 'PRIORITY'
    },
    transactions: [
      { id: 101, order_date: '2026-07-28', amount: 620, channel: 'Web' },
      { id: 102, order_date: '2026-06-12', amount: 540, channel: 'Mobile App' },
      { id: 103, order_date: '2026-05-02', amount: 480, channel: 'Web' },
      { id: 104, order_date: '2026-03-19', amount: 710, channel: 'Web' },
      { id: 105, order_date: '2026-01-14', amount: 890, channel: 'Web' }
    ]
  },
  '/api/v1/customers/1/explanation': {
    prediction_id: 101,
    customer_id: 1,
    risk_level: 'HIGH',
    probability: 0.742,
    base_value: 0.285,
    global_importance: [
      { feature: 'recency_days', label: 'Recency (Days Inactive)', importance: 0.38, share: 0.45 },
      { feature: 'engagement_score', label: 'Engagement Velocity', importance: 0.21, share: 0.25 },
      { feature: 'monetary', label: 'Monetary Spend', importance: 0.15, share: 0.18 },
      { feature: 'tenure_days', label: 'Customer Tenure', importance: 0.10, share: 0.12 }
    ],
    contributions: [
      { feature: 'recency_days', label: 'Days Since Last Order (84 days)', value: 84, contribution: 0.38, share: 0.48 },
      { feature: 'engagement_score', label: 'Drop in Order Velocity (-35%)', value: 0.71, contribution: 0.21, share: 0.26 },
      { feature: 'monetary', label: 'High Historical Spend ($8,420)', value: 8420, contribution: -0.12, share: 0.15 },
      { feature: 'tenure_days', label: 'Long Account Tenure (850 days)', value: 850, contribution: -0.08, share: 0.11 }
    ]
  },
  '/api/v1/ai/context': {
    available_views: ['dashboard_kpis', 'rfm_mix', 'churn_board', 'clv_matrix']
  },
  '/api/v1/ai/query': {
    answer: "Based on the latest Customer 360 data, we currently have **142 customers at high risk of churn**, representing **$124,500 in total value at risk**. The top concentration is in the PRIORITY quadrant (52 enterprise accounts). The primary driver across this group is prolonged inactivity exceeding 75 days.",
    views_used: ['churn_board', 'clv_matrix']
  },
  '/api/v1/ai/nl-to-sql': {
    question: "Which customers are at risk of churning?",
    sql: "SELECT c.id, c.name, p.probability, p.risk_level, cf.clv_est, (p.probability * cf.clv_est) AS value_at_risk\nFROM customers c\nJOIN predictions p ON p.customer_id = c.id\nJOIN customer_features cf ON cf.customer_id = c.id\nWHERE c.organization_id = 1 AND p.probability >= 0.70\nORDER BY value_at_risk DESC\nLIMIT 5;",
    executed: true,
    intent: "at_risk_customers",
    source: "template",
    row_count: 5,
    truncated: false,
    rows: [
      { id: 1, name: "Marcus Vance", probability: 0.884, risk_level: "CRITICAL", clv_est: 8420, value_at_risk: 7443.28 },
      { id: 2, name: "Global Tech Inc.", probability: 0.821, risk_level: "HIGH", clv_est: 7150, value_at_risk: 5870.15 },
      { id: 3, name: "Innovate Solutions", probability: 0.795, risk_level: "HIGH", clv_est: 6800, value_at_risk: 5406.00 },
      { id: 4, name: "Vertex Industries", probability: 0.762, risk_level: "HIGH", clv_est: 2400, value_at_risk: 1828.80 },
      { id: 5, name: "Dynamic Retail Corp", probability: 0.735, risk_level: "HIGH", clv_est: 2100, value_at_risk: 1543.50 }
    ],
    note: "Read-only query executed in 14ms against tenant organization_id=1."
  }
};

const apiServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0];
  console.log(`[API ${req.method}] ${urlPath}`);

  if (mockData[urlPath]) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mockData[urlPath]));
  } else if (urlPath.startsWith('/api/v1/customers/') && urlPath.endsWith('/explanation')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mockData['/api/v1/customers/1/explanation']));
  } else if (urlPath.startsWith('/api/v1/customers/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mockData['/api/v1/customers/1']));
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'OK', items: [] }));
  }
});

// 2. Static Frontend Server (serves frontend/dist)
const distPath = path.resolve(__dirname, '../frontend/dist');
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const frontendServer = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  let filePath = path.join(distPath, reqPath === '/' ? 'index.html' : reqPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distPath, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading ' + reqPath);
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

async function main() {
  await new Promise((r) => apiServer.listen(API_PORT, r));
  console.log(`Mock API Server running at http://localhost:${API_PORT}`);

  await new Promise((r) => frontendServer.listen(FRONTEND_PORT, r));
  console.log(`Frontend Static Server running at http://localhost:${FRONTEND_PORT}`);

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  async function setupAuthAndVisit(route) {
    await page.goto(`http://localhost:${FRONTEND_PORT}/login`);
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'mock_jwt_access_token_customer360');
      localStorage.setItem('refresh_token', 'mock_jwt_refresh_token_customer360');
    });
    await page.goto(`http://localhost:${FRONTEND_PORT}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500); // Allow charts, Recharts, and fonts to render
  }

  const screenshotsDir = path.resolve(__dirname, '../docs/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('1. Capturing REAL Dashboard screenshot...');
  await setupAuthAndVisit('/');
  await page.screenshot({ path: path.join(screenshotsDir, 'dashboard.jpg'), type: 'jpeg', quality: 95 });

  console.log('2. Capturing REAL At-Risk Board screenshot...');
  await setupAuthAndVisit('/at-risk');
  // Expand first explanation drawer
  try {
    const explainBtn = page.getByRole('button', { name: /explain/i }).first();
    if (await explainBtn.isVisible()) {
      await explainBtn.click();
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    console.log('Note on explain drawer:', e.message);
  }
  await page.screenshot({ path: path.join(screenshotsDir, 'at_risk_board.jpg'), type: 'jpeg', quality: 95 });

  console.log('3. Capturing REAL Customer 360 Detail with SHAP waterfall screenshot...');
  await setupAuthAndVisit('/customers/1');
  await page.screenshot({ path: path.join(screenshotsDir, 'customer_profile_shap.jpg'), type: 'jpeg', quality: 95 });

  console.log('4. Capturing REAL AI Analyst & NL-to-SQL screenshot...');
  await setupAuthAndVisit('/ai/analyst');
  // Trigger sample query
  try {
    const exampleBtn = page.getByText('How much revenue is at risk right now?').first();
    if (await exampleBtn.isVisible()) {
      await exampleBtn.click();
      await page.waitForTimeout(300);
      const askBtn = page.getByRole('button', { name: /ask analyst/i }).first();
      if (await askBtn.isVisible()) {
        await askBtn.click();
        await page.waitForTimeout(1200);
      }
    }
    const sqlExample = page.getByText('Which customers are at risk of churning?').first();
    if (await sqlExample.isVisible()) {
      await sqlExample.click();
      await page.waitForTimeout(300);
      const runSqlBtn = page.getByRole('button', { name: /run query|generate/i }).first();
      if (await runSqlBtn.isVisible()) {
        await runSqlBtn.click();
        await page.waitForTimeout(1200);
      }
    }
  } catch (e) {
    console.log('Note on AI Analyst interaction:', e.message);
  }
  await page.screenshot({ path: path.join(screenshotsDir, 'ai_analyst.jpg'), type: 'jpeg', quality: 95 });

  console.log('ALL REAL IMPLEMENTATION SCREENSHOTS CAPTURED SUCCESSFULLY!');
  await browser.close();
  apiServer.close();
  frontendServer.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal screenshot runner error:', err);
  apiServer.close();
  frontendServer.close();
  process.exit(1);
});
