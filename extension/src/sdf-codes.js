// Best-effort mapping between the short codes NetSuite's classic setup forms use and the
// SDF enumeration names documented in docs/sdf-publisheddashboard-reference.md.
// Codes marked "observed" were seen in a live account; the rest follow NetSuite's naming
// conventions and are flagged in the generated XML for verification (SDF validation rejects
// unknown values loudly, so a wrong guess cannot deploy silently).

export const DATE_RANGE_CODES = {
  TODAY: 'TODAY',                    // observed
  YESTERDAY: 'YESTERDAY',
  TOMORROW: 'TOMORROW',
  TW: 'THIS_WEEK',                   // observed
  TWTD: 'THIS_WEEK_TO_DATE',
  LW: 'LAST_WEEK',
  LWTD: 'LAST_WEEK_TO_DATE',
  NW: 'NEXT_WEEK',
  WBL: 'WEEK_BEFORE_LAST',
  TM: 'THIS_MONTH',                  // observed
  TMTD: 'THIS_MONTH_TO_DATE',
  LM: 'LAST_MONTH',
  LMTD: 'LAST_MONTH_TO_DATE',
  NM: 'NEXT_MONTH',
  MBL: 'MONTH_BEFORE_LAST',
  TQ: 'THIS_FISCAL_QUARTER',
  TQTD: 'THIS_FISCAL_QUARTER_TO_DATE',
  LQ: 'LAST_FISCAL_QUARTER',
  LQTD: 'LAST_FISCAL_QUARTER_TO_DATE',
  NQ: 'NEXT_FISCAL_QUARTER',
  FQBL: 'FISCAL_QUARTER_BEFORE_LAST',
  TFH: 'THIS_FISCAL_HALF',
  TFHTD: 'THIS_FISCAL_HALF_TO_DATE',
  LFH: 'LAST_FISCAL_HALF',
  LFHTD: 'LAST_FISCAL_HALF_TO_DATE',
  FHBL: 'FISCAL_HALF_BEFORE_LAST',           // observed
  FHBLTD: 'FISCAL_HALF_BEFORE_LAST_TO_DATE', // observed
  TFY: 'THIS_FISCAL_YEAR',
  TFYTD: 'THIS_FISCAL_YEAR_TO_DATE',
  LFY: 'LAST_FISCAL_YEAR',
  LFYTD: 'LAST_FISCAL_YEAR_TO_DATE',
  NFY: 'NEXT_FISCAL_YEAR',
  FYBL: 'FISCAL_YEAR_BEFORE_LAST',
  TY: 'THIS_YEAR',
  TYTD: 'THIS_YEAR_TO_DATE',
  LY: 'LAST_YEAR',
  LYTD: 'SAME_DAY_LAST_FISCAL_YEAR',   // observed label "same day last year"
  SDLW: 'SAME_DAY_LAST_WEEK',              // observed
  SDLM: 'SAME_DAY_LAST_MONTH',
  LRY: 'LAST_ROLLING_YEAR',                // observed
  LRQ: 'LAST_ROLLING_QUARTER',
  LRH: 'LAST_ROLLING_HALF',
  TRY: 'THIS_ROLLING_YEAR',
  TRQ: 'THIS_ROLLING_QUARTER',
  TRH: 'THIS_ROLLING_HALF',
  SMLFQTD: 'SAME_MONTH_LAST_FISCAL_QUARTER_TO_DATE', // observed
  SMLFQ: 'SAME_MONTH_LAST_FISCAL_QUARTER',
  SMLFYTD: 'SAME_MONTH_LAST_FISCAL_YEAR_TO_DATE',
  SDLQ: 'SAME_DAY_LAST_FISCAL_QUARTER',
  SDLFY: 'SAME_DAY_LAST_FISCAL_YEAR',
  SMLFY: 'SAME_MONTH_LAST_FISCAL_YEAR',
  SQLFY: 'SAME_FISCAL_QUARTER_LAST_FISCAL_YEAR',
  P30D: 'THIRTY_DAYS_AGO',
  P60D: 'SIXTY_DAYS_AGO',
  P90D: 'NINETY_DAYS_AGO',
};

export const PERIOD_RANGE_CODES = {
  TP: 'THIS_PERIOD',                 // observed
  LP: 'LAST_PERIOD',                 // observed
  PBL: 'PERIOD_BEFORE_LAST',
  TQ: 'THIS_FISCAL_QUARTER',
  LQ: 'LAST_FISCAL_QUARTER',
  FQBL: 'FISCAL_QUARTER_BEFORE_LAST',
  TFY: 'THIS_FISCAL_YEAR',
  LFY: 'LAST_FISCAL_YEAR',
  FYBL: 'FISCAL_YEAR_BEFORE_LAST',
  TQTP: 'THIS_FISCAL_QUARTER_TO_PERIOD',
  LQTP: 'LAST_FISCAL_QUARTER_TO_PERIOD',
  TFYTP: 'THIS_FISCAL_YEAR_TO_PERIOD',
  LFYTP: 'LAST_FISCAL_YEAR_TO_PERIOD',
  SPLFY: 'SAME_PERIOD_LAST_FY',
  SPLQ: 'SAME_PERIOD_LAST_FISCAL_QUARTER',
  SQLFY: 'SAME_FISCAL_QUARTER_LAST_FY',
  SQLFYTP: 'SAME_FISCAL_QUARTER_LAST_FY_TO_PERIOD',
  Q1TFY: 'FIRST_FISCAL_QUARTER_THIS_FY',
  Q2TFY: 'SECOND_FISCAL_QUARTER_THIS_FY',
  Q3TFY: 'THIRD_FISCAL_QUARTER_THIS_FY',
  Q4TFY: 'FOURTH_FISCAL_QUARTER_THIS_FY',
  Q1LFY: 'FIRST_FISCAL_QUARTER_LAST_FY',   // observed
  Q2LFY: 'SECOND_FISCAL_QUARTER_LAST_FY',
  Q3LFY: 'THIRD_FISCAL_QUARTER_LAST_FY',
  Q4LFY: 'FOURTH_FISCAL_QUARTER_LAST_FY',
  LR18P: 'LAST_ROLLING_18_PERIODS',
  LR6Q: 'LAST_ROLLING_6_FISCAL_QUARTERS',
};

/** Report Snapshot period list uses abbreviated spellings. */
export const SNAPSHOT_PERIOD_CODES = {
  TP: 'THIS_PERIOD', LP: 'LAST_PERIOD', PBL: 'PERIOD_BEFORE_LAST',
  TQ: 'THIS_FISCAL_QUARTER', LQ: 'LAST_FISCAL_QUARTER', FQBL: 'FQTR_BEFORE_LAST',
  TFY: 'THIS_FISCAL_YEAR', LFY: 'LAST_FISCAL_YEAR', FYBL: 'FYEAR_BEFORE_LAST',
  TQTP: 'THIS_FQTR_TO_PERIOD', LQTP: 'LAST_FQTR_TO_PERIOD', TFYTP: 'THIS_FYEAR_TO_PERIOD', LFYTP: 'LAST_FYEAR_TO_PERIOD',
  SPLFY: 'SAME_PERIOD_LAST_FYEAR', SPLQ: 'SAME_PERIOD_LAST_FQTR', SQLFY: 'SAME_FQTR_LAST_FYEAR', SQLFYTP: 'SAME_FQTR_LAST_FYEAR_TO_PERIOD',
  Q1TFY: '1ST_FQTR_THIS_FYEAR', Q2TFY: '2ND_FQTR_THIS_FYEAR', Q3TFY: '3RD_FQTR_THIS_FYEAR', Q4TFY: '4TH_FQTR_THIS_FYEAR',
  Q1LFY: '1ST_FQTR_LAST_FYEAR', Q2LFY: '2ND_FQTR_LAST_FYEAR', Q3LFY: '3RD_FQTR_LAST_FYEAR', Q4LFY: '4TH_FQTR_LAST_FYEAR',
  LR18P: 'LAST_ROLLING_18_PERIODS', LR6Q: 'LAST_ROLLING_6_FQTRS',
};

export const HIGHLIGHT_CODES = {
  ALWAYS: 'ALWAYS', GT: 'GREATER_THAN', LT: 'LESS_THAN', VGT: 'VARIANCE_GREATER_THAN', VLT: 'VARIANCE_LESS_THAN',
  GREATER_THAN: 'GREATER_THAN', LESS_THAN: 'LESS_THAN', VARIANCE_GREATER_THAN: 'VARIANCE_GREATER_THAN', VARIANCE_LESS_THAN: 'VARIANCE_LESS_THAN',
};

export const CENTERS = ['BASIC', 'ACCOUNTCENTER', 'SALESCENTER', 'SUPPORTCENTER', 'MARKETCENTER', 'SHIPPINGCENTER', 'EXECUTIVE', 'ENGINEERCENTER', 'HR', 'PARTNERCENTER', 'PROJECTCENTER', 'STOREMANAGER', 'SYSADMINCENTER'];

/** Standard center-tab ids -> generic_centertab codes (Home is BASICCENTERHOMEHOME in every Oracle example). */
export const STANDARD_CENTERTABS = {
  '-29': 'BASICCENTERHOMEHOME',
  '-7': 'BASICCENTERTRANSACTIONS',
  '-8': 'BASICCENTERLISTS',
  '-9': 'BASICCENTERREPORTS',
  '-11': 'BASICCENTERSUPPORT',
  '-190': 'BASICCENTERCOMMERCE',
  '-22': 'BASICCENTERACTIVITIES',
  '-10': 'BASICCENTERSETUP',
  '-90': 'BASICCENTERCUSTOMIZATION',
};

/** Theme/background codes from setup forms ("searchresults_global_theme") -> SDF values. */
export function themeCode(v, tripleUnderscore = false) {
  if (!v) return null;
  let s = String(v).replace(/^(searchresults|trendgraph|enhsnapshots|list)_/, '').toUpperCase();
  if (tripleUnderscore) s = s.replace('MATCH_COLOR_THEME_', 'MATCH_COLOR_THEME___');
  return s;
}

export function drilldownCode(v) {
  if (!v) return null;
  const s = String(v).toUpperCase();
  if (s === 'NEWPAGE' || s === 'NEW_PAGE') return 'NEW_PAGE';
  if (s === 'INPORTLET' || s === 'IN_PORTLET' || s === 'PORTLET') return 'IN_PORTLET';
  return s;
}

export function chartTypeCode(v) {
  if (!v) return null;
  const s = String(v).replace(/^trendgraph_/, '').toUpperCase();
  return s === 'BAR_VERTICAL' ? 'COLUMN' : s === 'BAR_HORIZONTAL' ? 'BAR' : s;
}

export function topxCode(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) return String(v).toUpperCase();
  return n < 0 ? `BOTTOM_${Math.abs(n)}` : `TOP_${n}`;
}
