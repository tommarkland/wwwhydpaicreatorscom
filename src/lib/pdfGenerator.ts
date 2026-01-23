import { Evaluation } from '@/components/evaluation/EvaluationList';
import { format } from 'date-fns';

interface BrandSettings {
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export const generatePdfReport = async (
  evaluation: Evaluation,
  brandSettings: BrandSettings
): Promise<void> => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Unable to open print window');
  }

  const primaryColor = brandSettings.primaryColor || '#3B82F6';
  const secondaryColor = brandSettings.secondaryColor || '#1E40AF';
  const companyName = brandSettings.companyName || 'Creator Evaluation Tool';

  const getSafetyStatus = (score: number | null) => {
    if (score === null) return { label: 'Not Analyzed', color: '#6B7280' };
    if (score >= 80) return { label: 'Low Risk', color: '#16A34A' };
    if (score >= 50) return { label: 'Medium Risk', color: '#CA8A04' };
    return { label: 'High Risk', color: '#DC2626' };
  };

  const safetyStatus = getSafetyStatus(evaluation.brand_safety_score);

  const formatNumber = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Creator Evaluation Report - ${evaluation.creator_name}</title>
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #1F2937;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid ${primaryColor};
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo-section img {
          max-height: 50px;
          max-width: 150px;
        }
        .company-name {
          font-size: 20px;
          font-weight: 600;
          color: ${secondaryColor};
        }
        .report-date {
          color: #6B7280;
          font-size: 14px;
        }
        .creator-name {
          font-size: 32px;
          font-weight: 700;
          color: ${primaryColor};
          margin-bottom: 8px;
        }
        .creator-meta {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }
        .meta-badge {
          background: #F3F4F6;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 14px;
        }
        .section {
          margin-bottom: 32px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: ${secondaryColor};
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid #E5E7EB;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .metric-card {
          background: #F9FAFB;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
        }
        .metric-label {
          font-size: 12px;
          color: #6B7280;
          margin-bottom: 4px;
        }
        .metric-value {
          font-size: 20px;
          font-weight: 600;
          color: #1F2937;
        }
        .scores-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        .score-card {
          padding: 24px;
          border-radius: 12px;
          text-align: center;
        }
        .quality-score {
          background: linear-gradient(135deg, ${primaryColor}15, ${primaryColor}25);
          border: 2px solid ${primaryColor}40;
        }
        .safety-score {
          background: ${safetyStatus.color}15;
          border: 2px solid ${safetyStatus.color}40;
        }
        .score-label {
          font-size: 14px;
          color: #6B7280;
          margin-bottom: 8px;
        }
        .score-value {
          font-size: 48px;
          font-weight: 700;
        }
        .quality-value {
          color: ${primaryColor};
        }
        .safety-value {
          color: ${safetyStatus.color};
        }
        .score-status {
          font-size: 14px;
          font-weight: 500;
          margin-top: 8px;
        }
        .issues-list {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }
        .issues-title {
          color: #DC2626;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .issues-list ul {
          margin-left: 20px;
        }
        .issues-list li {
          color: #7F1D1D;
          margin-bottom: 4px;
        }
        .summary-box {
          background: #F3F4F6;
          padding: 16px;
          border-radius: 8px;
          margin-top: 16px;
        }
        .summary-box p {
          color: #4B5563;
        }
        .notes-section {
          background: #FFFBEB;
          border: 1px solid #FDE68A;
          border-radius: 8px;
          padding: 16px;
        }
        .notes-section p {
          color: #78350F;
          white-space: pre-wrap;
        }
        .urls-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .url-item {
          color: ${primaryColor};
          word-break: break-all;
        }
        .footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #E5E7EB;
          text-align: center;
          color: #9CA3AF;
          font-size: 12px;
        }
        @media print {
          body {
            padding: 20px;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-section">
          ${brandSettings.logoUrl ? `<img src="${brandSettings.logoUrl}" alt="Logo" />` : ''}
          <span class="company-name">${companyName}</span>
        </div>
        <div class="report-date">
          Generated on ${format(new Date(), 'MMMM d, yyyy')}
        </div>
      </div>

      <h1 class="creator-name">${evaluation.creator_name}</h1>
      <div class="creator-meta">
        <span class="meta-badge">${evaluation.category}</span>
        <span class="meta-badge">${evaluation.region}</span>
        <span class="meta-badge">Evaluated: ${format(new Date(evaluation.created_at), 'MMM d, yyyy')}</span>
      </div>

      ${evaluation.creator_urls ? `
        <div class="section">
          <h2 class="section-title">Creator URLs</h2>
          <div class="urls-list">
            ${evaluation.creator_urls.split('\n').filter(Boolean).map(url => `
              <span class="url-item">${url}</span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="section">
        <h2 class="section-title">Performance Metrics</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Following Size</div>
            <div class="metric-value">${formatNumber(evaluation.following_size)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Cost</div>
            <div class="metric-value">${formatCurrency(evaluation.cost)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Average Views</div>
            <div class="metric-value">${formatNumber(evaluation.average_views)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Content Quality</div>
            <div class="metric-value">${evaluation.content_quality !== null ? `${evaluation.content_quality}/10` : '-'}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Evaluation Scores</h2>
        <div class="scores-grid">
          <div class="score-card quality-score">
            <div class="score-label">Quality Score</div>
            <div class="score-value quality-value">
              ${evaluation.quality_score !== null ? evaluation.quality_score.toFixed(1) : '-'}
            </div>
          </div>
          <div class="score-card safety-score">
            <div class="score-label">Brand Safety Score</div>
            <div class="score-value safety-value">
              ${evaluation.brand_safety_score !== null ? evaluation.brand_safety_score : '-'}
            </div>
            <div class="score-status" style="color: ${safetyStatus.color}">
              ${safetyStatus.label}
            </div>
          </div>
        </div>

        ${evaluation.brand_safety_issues && evaluation.brand_safety_issues.length > 0 ? `
          <div class="issues-list">
            <div class="issues-title">⚠️ Flagged Issues</div>
            <ul>
              ${evaluation.brand_safety_issues.map(issue => `<li>${issue}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${evaluation.brand_safety_summary ? `
          <div class="summary-box">
            <strong>Brand Safety Summary</strong>
            <p>${evaluation.brand_safety_summary}</p>
          </div>
        ` : ''}
      </div>

      ${evaluation.notes ? `
        <div class="section">
          <h2 class="section-title">Additional Notes</h2>
          <div class="notes-section">
            <p>${evaluation.notes}</p>
          </div>
        </div>
      ` : ''}

      <div class="footer">
        <p>This report was generated by ${companyName}</p>
        <p>Confidential - For internal use only</p>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
