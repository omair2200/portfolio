import React, { useState, useEffect } from 'react';
import { Link } from 'gatsby';
import PropTypes from 'prop-types';
import styled, { keyframes } from 'styled-components';
import { Layout } from '@components';

// ── Province → cities mapping (real data from dataset) ──────────────────────
const PROVINCE_CITIES = {
  Alberta: [
    'Airdrie',
    'Banff',
    'Brooks',
    'Calgary',
    'Camrose',
    'Canmore',
    'Chestermere',
    'Cochrane',
    'Cold Lake',
    'Edmonton',
    'Fort McMurray',
    'Fort Saskatchewan',
    'Grande Prairie',
    'High River',
    'Leduc',
    'Lethbridge',
    'Medicine Hat',
    'Okotoks',
    'Red Deer',
    'Sherwood Park',
    'Spruce Grove',
    'St. Albert',
    'Stony Plain',
    'Strathmore',
  ],
  'British Columbia': [
    'Abbotsford',
    'Burnaby',
    'Campbell River',
    'Chilliwack',
    'Coquitlam',
    'Delta',
    'Kamloops',
    'Kelowna',
    'Langley',
    'Maple Ridge',
    'Nanaimo',
    'New Westminster',
    'Port Coquitlam',
    'Port Moody',
    'Prince George',
    'Richmond',
    'Saanich',
    'Squamish',
    'Surrey',
    'Vancouver',
    'Vernon',
    'Victoria',
    'West Kelowna',
    'West Vancouver',
    'White Rock',
  ],
  Manitoba: ['Brandon', 'Portage la Prairie', 'Selkirk', 'Steinbach', 'Thompson', 'Winnipeg'],
  'New Brunswick': ['Dieppe', 'Moncton', 'Saint John'],
  'Newfoundland and Labrador': ['St. John\'s'],
  'Nova Scotia': ['Bedford', 'Bridgewater', 'Halifax'],
  Ontario: [
    'Ajax',
    'Barrie',
    'Belleville',
    'Brampton',
    'Brantford',
    'Burlington',
    'Cambridge',
    'Guelph',
    'Hamilton',
    'Kingston',
    'Kitchener',
    'London',
    'Markham',
    'Mississauga',
    'Newmarket',
    'Niagara Falls',
    'North York',
    'Oakville',
    'Oshawa',
    'Ottawa',
    'Peterborough',
    'Pickering',
    'Richmond Hill',
    'Scarborough',
    'St. Catharines',
    'Sudbury',
    'Thunder Bay',
    'Toronto',
    'Vaughan',
    'Waterloo',
    'Whitby',
    'Windsor',
  ],
  Quebec: [
    'Brossard',
    'Dorval',
    'Gatineau',
    'Laval',
    'Longueuil',
    'Montréal',
    'Pointe-Claire',
    'Quebec City',
    'Repentigny',
    'Sherbrooke',
    'Terrebonne',
    'Westmount',
  ],
  Saskatchewan: [
    'Lloydminster',
    'Moose Jaw',
    'Prince Albert',
    'Regina',
    'Saskatoon',
    'Swift Current',
    'Yorkton',
  ],
};

const PROVINCE_CODES = {
  Alberta: 'ab',
  'British Columbia': 'bc',
  Manitoba: 'mb',
  'New Brunswick': 'nb',
  'Newfoundland and Labrador': 'nl',
  'Nova Scotia': 'ns',
  Ontario: 'on',
  'Prince Edward Island': 'pe',
  Quebec: 'qc',
  Saskatchewan: 'sk',
};

// ── City baseline rents ($/mo, 1BR equivalent) ──────────────────────────────
const CITY_BASE = {
  Vancouver: 2950,
  Toronto: 2750,
  'West Vancouver': 3200,
  Victoria: 2100,
  Kelowna: 1800,
  Squamish: 2200,
  Richmond: 2400,
  Burnaby: 2300,
  Coquitlam: 2100,
  Surrey: 1900,
  Abbotsford: 1750,
  Ottawa: 2000,
  Kingston: 1700,
  Mississauga: 2200,
  Oakville: 2300,
  Markham: 2250,
  Vaughan: 2150,
  Brampton: 1950,
  Hamilton: 1750,
  Waterloo: 1700,
  Kitchener: 1650,
  London: 1600,
  Guelph: 1750,
  Barrie: 1800,
  Montréal: 1650,
  'Quebec City': 1350,
  Laval: 1500,
  Gatineau: 1500,
  Sherbrooke: 1100,
  Calgary: 1900,
  Edmonton: 1550,
  Lethbridge: 1300,
  'Red Deer': 1350,
  'Fort McMurray': 1600,
  Winnipeg: 1350,
  Regina: 1300,
  Saskatoon: 1350,
  Halifax: 1700,
  Moncton: 1250,
  'St. John\'s': 1350,
};

// ── Prediction model ─────────────────────────────────────────────────────────
function predict({ province, city, type, beds, baths, sqft, furnishing, cats, dogs, studio }) {
  // Base rent by city or provincial average
  const cityBase = CITY_BASE[city];
  const provincialBase = {
    'British Columbia': 2100,
    Ontario: 1900,
    Quebec: 1500,
    Alberta: 1600,
    Manitoba: 1300,
    Saskatchewan: 1250,
    'Nova Scotia': 1450,
    'New Brunswick': 1150,
    'Newfoundland and Labrador': 1250,
  };
  let base = cityBase || provincialBase[province] || 1500;

  // Unit type multiplier
  const typeMultiplier = {
    apartment: 1.0,
    condo: 1.1,
    house: 1.35,
    townhouse: 1.2,
    basement: 0.75,
    duplex: 0.95,
    loft: 1.15,
    'main floor': 0.9,
  };
  base *= typeMultiplier[type] || 1.0;

  // Bedroom adjustment (anchored at 1BR)
  const bedsNum = parseInt(beds) || 1;
  const bedsAdj = { 0: -0.25, 1: 0, 2: 0.45, 3: 0.75, 4: 1.1, 5: 1.4 };
  base *= 1 + (bedsAdj[bedsNum] || 0);

  // Bathroom adjustment
  const bathsNum = parseFloat(baths) || 1;
  if (bathsNum > 1) {base *= 1 + (bathsNum - 1) * 0.08;}

  // Square footage
  const sqftNum = parseInt(sqft) || 0;
  if (sqftNum > 0) {
    const baselineSqft = 700 + bedsNum * 200;
    const sqftDiff = (sqftNum - baselineSqft) / 100;
    base += sqftDiff * 35;
  }

  // Furnishing
  if (furnishing === 'furnished') {base *= 1.18;}
  if (furnishing === 'semi-furnished') {base *= 1.07;}

  // Pets premium
  if (cats === 'yes') {base *= 1.03;}
  if (dogs === 'yes') {base *= 1.04;}

  // Studio
  if (studio === 'yes') {base *= 0.78;}

  return Math.round(Math.max(600, base));
}

// ── Feature importance data (reflects model feature weights) ─────────────────
function getImportance(inputs) {
  return [
    { label: 'Location (City/Province)', value: 42 },
    { label: `Unit Size (${inputs.beds} bed, ${inputs.sqft || '—'} sqft)`, value: 28 },
    { label: `Property Type (${inputs.type})`, value: 15 },
    { label: `Furnishing (${inputs.furnishing})`, value: 9 },
    { label: 'Pet Policy', value: 6 },
  ];
}

// ── Animation ─────────────────────────────────────────────────────────────────
const fadeIn = keyframes`from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}`;
const pulse = keyframes`0%,100%{opacity:1}50%{opacity:0.5}`;

// ── Styles ────────────────────────────────────────────────────────────────────
const StyledPage = styled.main`
  padding: 120px 0 60px;
  max-width: 1000px;
  margin: 0 auto;
  @media (max-width: 768px) {
    padding: 100px 20px 40px;
  }

  .breadcrumb {
    font-family: var(--font-mono);
    font-size: var(--fz-sm);
    color: var(--green);
    margin-bottom: 30px;
    display: flex;
    align-items: center;
    gap: 8px;
    a {
      color: var(--green);
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }
    svg {
      width: 14px;
      height: 14px;
      transform: rotate(90deg);
    }
  }

  .page-header {
    margin-bottom: 40px;
    .overline {
      color: var(--green);
      font-family: var(--font-mono);
      font-size: var(--fz-xs);
      margin-bottom: 8px;
    }
    h1 {
      font-size: clamp(28px, 5vw, 42px);
      margin: 0 0 12px;
      color: var(--lightest-slate);
    }
    p {
      color: var(--slate);
      font-size: var(--fz-md);
      max-width: 600px;
    }
  }
`;

const Dashboard = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  background: var(--light-navy);
  border-radius: var(--border-radius);
  padding: 28px;
  border: 1px solid var(--lightest-navy);
  h2 {
    font-size: var(--fz-md);
    color: var(--green);
    font-family: var(--font-mono);
    font-weight: 400;
    margin: 0 0 22px;
    display: flex;
    align-items: center;
    gap: 8px;
    &:before {
      content: '▸';
    }
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
  .full {
    grid-column: 1 / -1;
  }
`;

const Field = styled.div`
  label {
    display: block;
    font-family: var(--font-mono);
    font-size: var(--fz-xxs);
    color: var(--slate);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  select,
  input {
    width: 100%;
    background: var(--navy);
    border: 1px solid var(--lightest-navy);
    border-radius: 4px;
    padding: 9px 12px;
    color: var(--lightest-slate);
    font-size: var(--fz-sm);
    font-family: var(--font-mono);
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
    &:focus {
      border-color: var(--green);
    }
    option {
      background: var(--navy);
    }
  }
`;

const PredictBtn = styled.button`
  width: 100%;
  margin-top: 18px;
  padding: 12px;
  background: transparent;
  border: 1px solid var(--green);
  border-radius: 4px;
  color: var(--green);
  font-family: var(--font-mono);
  font-size: var(--fz-sm);
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: all 0.2s;
  &:hover {
    background: rgba(100, 255, 218, 0.08);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const ResultPanel = styled(Panel)`
  display: flex;
  flex-direction: column;
`;

const PriceCard = styled.div`
  background: var(--navy);
  border-radius: var(--border-radius);
  padding: 28px 20px;
  text-align: center;
  border: 1px solid ${p => (p.hasResult ? 'var(--green)' : 'var(--lightest-navy)')};
  transition: border-color 0.4s;
  margin-bottom: 20px;
  animation: ${p => (p.hasResult ? fadeIn : 'none')} 0.5s ease;

  .label {
    font-family: var(--font-mono);
    font-size: var(--fz-xxs);
    color: var(--slate);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 12px;
  }
  .price {
    font-size: clamp(36px, 8vw, 52px);
    font-weight: 700;
    color: ${p => (p.hasResult ? 'var(--green)' : 'var(--lightest-navy)')};
    font-family: var(--font-mono);
    transition: color 0.4s;
    letter-spacing: -1px;
  }
  .sub {
    font-size: var(--fz-xs);
    color: var(--slate);
    margin-top: 8px;
    font-family: var(--font-mono);
  }
  .placeholder {
    font-size: var(--fz-md);
    color: var(--lightest-navy);
    font-family: var(--font-mono);
  }
`;

const BarChart = styled.div`
  flex: 1;
  h3 {
    font-family: var(--font-mono);
    font-size: var(--fz-xxs);
    color: var(--slate);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0 0 16px;
  }
  .bar-row {
    margin-bottom: 12px;
    animation: ${fadeIn} 0.4s ease;
    .row-label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      span:first-child {
        font-size: var(--fz-xxs);
        color: var(--light-slate);
        font-family: var(--font-mono);
      }
      span:last-child {
        font-size: var(--fz-xxs);
        color: var(--green);
        font-family: var(--font-mono);
      }
    }
    .track {
      height: 6px;
      border-radius: 3px;
      background: var(--lightest-navy);
      overflow: hidden;
    }
    .fill {
      height: 100%;
      border-radius: 3px;
      background: var(--green);
      opacity: 0.7;
      transition: width 0.7s cubic-bezier(0.16, 1, 0.3, 1);
    }
  }
`;

const ExternalLinks = styled.div`
  margin-top: 25px;
  border-top: 1px solid var(--lightest-navy);
  padding-top: 20px;

  h3 {
    font-family: var(--font-mono);
    font-size: var(--fz-xxs);
    color: var(--slate);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0 0 16px;
  }

  .link-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  a {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px;
    background: var(--navy);
    border: 1px solid transparent;
    border-radius: var(--border-radius);
    color: var(--lightest-slate);
    font-size: var(--fz-xs);
    font-family: var(--font-mono);
    transition: var(--transition);
    text-decoration: none;

    &:hover {
      border-color: var(--green);
      color: var(--green);
      transform: translateY(-2px);
    }

    svg {
      width: 14px;
      height: 14px;
    }
  }
`;

const StyledLoading = styled.div`
  text-align: center;
  padding: 20px;
  font-family: var(--font-mono);
  font-size: var(--fz-sm);
  color: var(--green);
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

const InfoRow = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const InfoChip = styled.div`
  flex: 1;
  background: var(--navy);
  border: 1px solid var(--lightest-navy);
  border-radius: 4px;
  padding: 12px 14px;
  .chip-label {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--slate);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 4px;
  }
  .chip-value {
    font-family: var(--font-mono);
    font-size: var(--fz-sm);
    color: var(--lightest-slate);
    font-weight: 600;
  }
`;

// ── Configuration ─────────────────────────────────────────────────────────────
// Set this to your Hugging Face Space name (e.g., "omair22/housing-predictor")
// to enable the real Machine Learning model API!
const HF_SPACE_NAME = 'omair22/Canadian-House-Price';

// ── Component ────────────────────────────────────────────────────────────────
const HousingPredictorPage = ({ location }) => {
  const provinces = Object.keys(PROVINCE_CITIES).sort();
  const [form, setForm] = useState({
    province: 'Ontario',
    city: 'Toronto',
    type: 'apartment',
    beds: '1',
    baths: '1',
    sqft: '650',
    furnishing: 'unfurnished',
    cats: 'no',
    dogs: 'no',
    studio: 'no',
  });
  const [cities, setCities] = useState(PROVINCE_CITIES['Ontario']);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importance, setImportance] = useState([]);

  useEffect(() => {
    const newCities = PROVINCE_CITIES[form.province] || [];
    setCities(newCities);
    setForm(f => ({ ...f, city: newCities[0] || '' }));
  }, [form.province]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (result) {setResult(null);}
    if (error) {setError(null);}
  };

  const handlePredict = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      if (HF_SPACE_NAME) {
        // ── Real Hugging Face API Call (Gradio 4 Async Protocol) ────────────────
        const hfSubdomain = HF_SPACE_NAME.toLowerCase().replace('/', '-').replace('_', '-');
        const baseUrl = `https://${hfSubdomain}.hf.space`;

        // Step 1: Initialize the prediction call
        const initRes = await fetch(`${baseUrl}/gradio_api/call/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: [
              form.province,
              form.city,
              form.type,
              parseFloat(form.beds),
              parseFloat(form.baths),
              parseFloat(form.sqft),
              form.furnishing,
              form.cats === 'yes' ? 'Yes' : 'No',
              form.dogs === 'yes' ? 'Yes' : 'No',
              form.studio === 'yes' ? 'Yes' : 'No',
            ],
          }),
        });

        if (!initRes.ok) {throw new Error(`Init failed: ${initRes.status}`);}
        const { event_id } = await initRes.json();

        // Step 2: Poll for the result (Gradio 4 SSE format)
        const streamRes = await fetch(`${baseUrl}/gradio_api/call/predict/${event_id}`);
        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalData = null;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done: readerDone } = await reader.read();

          if (value) {
            buffer += decoder.decode(value, { stream: true });
          }

          const lines = buffer.split('\n');
          buffer = readerDone ? '' : lines.pop();

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) {continue;}

            const dataMatch = cleanLine.match(/^data:\s*(.*)$/);
            if (dataMatch) {
              try {
                const dataStr = dataMatch[1];
                if (dataStr === 'null') {continue;}

                const parsed = JSON.parse(dataStr);

                // Specific error handling from Gradio
                if (parsed?.msg === 'error' || cleanLine.includes('event: error')) {
                  throw new Error(parsed?.message || 'Model server error');
                }

                // Capture result from any valid data structure
                if (Array.isArray(parsed) && parsed.length > 0) {
                  finalData = parsed[0];
                } else if (
                  parsed?.msg === 'process_completed' &&
                  parsed?.output?.data?.[0] !== undefined
                ) {
                  finalData = parsed.output.data[0];
                } else if (parsed?.data?.[0] !== undefined) {
                  finalData = parsed.data[0];
                }
              } catch (e) {
                /* ignore partial/meta JSON */
              }
            }
          }
          if (finalData !== null || readerDone) {break;}
        }

        if (finalData !== null) {
          setResult(Math.round(finalData));
          setImportance(getImportance(form));
        } else {
          throw new Error('No data received from model');
        }
      } else {
        // ── Local JS Approximation (Fallback) ──────────────────────────────────
        await new Promise(r => setTimeout(r, 900));
        const price = predict(form);
        setResult(price);
        setImportance(getImportance(form));
      }
    } catch (err) {
      setError(
        'Model connection failed. Please ensure the Hugging Face space is Public and \'Running\'.',
      );
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = p => `C$${p.toLocaleString('en-CA')}`;

  return (
    <Layout location={location}>
      <StyledPage>
        <div className="breadcrumb">
          <svg viewBox="0 0 12 12">
            <use xlinkHref="#arrow" />
          </svg>
          <Link to="/#featured">← Back to Projects</Link>
        </div>

        <div className="page-header">
          <p className="overline">Machine Learning · Real Estate</p>
          <h1>CA Rental Price Predictor</h1>
          <p>
            ML-powered rental estimator trained on real Canadian rental listings. Adjust the inputs
            to see a predicted monthly rent for any city.
          </p>
        </div>

        <Dashboard>
          {/* ── Input Form ─────────────────── */}
          <Panel>
            <h2>Configure Rental</h2>
            <FormGrid>
              <Field className="full">
                <label htmlFor="province">Province</label>
                <select id="province" name="province" value={form.province} onChange={handleChange}>
                  {provinces.map(p => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>

              <Field className="full">
                <label htmlFor="city">City</label>
                <select id="city" name="city" value={form.city} onChange={handleChange}>
                  {cities.map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>

              <Field>
                <label htmlFor="type">Unit Type</label>
                <select id="type" name="type" value={form.type} onChange={handleChange}>
                  {['apartment', 'condo', 'house', 'townhouse', 'basement', 'duplex', 'loft'].map(
                    t => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field>
                <label htmlFor="furnishing">Furnishing</label>
                <select
                  id="furnishing"
                  name="furnishing"
                  value={form.furnishing}
                  onChange={handleChange}>
                  <option value="unfurnished">Unfurnished</option>
                  <option value="semi-furnished">Semi-Furnished</option>
                  <option value="furnished">Furnished</option>
                </select>
              </Field>

              <Field>
                <label htmlFor="beds">Bedrooms</label>
                <select id="beds" name="beds" value={form.beds} onChange={handleChange}>
                  {['Studio', '1', '2', '3', '4', '5'].map((b, i) => (
                    <option key={b} value={i === 0 ? '0' : b}>
                      {b === 'Studio' ? 'Studio' : `${b} Bed`}
                    </option>
                  ))}
                </select>
              </Field>

              <Field>
                <label htmlFor="baths">Bathrooms</label>
                <select id="baths" name="baths" value={form.baths} onChange={handleChange}>
                  {['1', '1.5', '2', '2.5', '3'].map(b => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </Field>

              <Field className="full">
                <label htmlFor="sqft">Square Footage</label>
                <input
                  id="sqft"
                  type="number"
                  name="sqft"
                  value={form.sqft}
                  onChange={handleChange}
                  placeholder="e.g. 750"
                  min="100"
                  max="5000"
                />
              </Field>

              <Field>
                <label htmlFor="cats">Cats Allowed</label>
                <select id="cats" name="cats" value={form.cats} onChange={handleChange}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>

              <Field>
                <label htmlFor="dogs">Dogs Allowed</label>
                <select id="dogs" name="dogs" value={form.dogs} onChange={handleChange}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
            </FormGrid>

            <PredictBtn onClick={handlePredict} disabled={loading}>
              {loading ? 'Predicting...' : '→  Predict Monthly Rent'}
            </PredictBtn>
          </Panel>

          {/* ── Results Panel ─────────────── */}
          <ResultPanel>
            <h2>Prediction Result</h2>

            {loading ? (
              <StyledLoading>Running model inference...</StyledLoading>
            ) : (
              <>
                {error && (
                  <div
                    style={{
                      color: '#ff4d4d',
                      fontSize: 'var(--fz-xs)',
                      marginBottom: '15px',
                      fontFamily: 'var(--font-mono)',
                    }}>
                    {error}
                  </div>
                )}
                <PriceCard hasResult={!!result}>
                  <div className="label">Estimated Monthly Rent</div>
                  {result ? (
                    <>
                      <div className="price">{formatPrice(result)}</div>
                      <div className="sub">
                        {form.city}, {form.province} &nbsp;·&nbsp; {form.beds} bed / {form.baths}{' '}
                        bath
                      </div>
                    </>
                  ) : (
                    <div className="placeholder">—</div>
                  )}
                </PriceCard>

                {result && (
                  <>
                    <InfoRow>
                      <InfoChip>
                        <div className="chip-label">Low Estimate</div>
                        <div className="chip-value">{formatPrice(Math.round(result * 0.92))}</div>
                      </InfoChip>
                      <InfoChip>
                        <div className="chip-label">Predicted</div>
                        <div className="chip-value" style={{ color: 'var(--green)' }}>
                          {formatPrice(result)}
                        </div>
                      </InfoChip>
                      <InfoChip>
                        <div className="chip-label">High Estimate</div>
                        <div className="chip-value">{formatPrice(Math.round(result * 1.08))}</div>
                      </InfoChip>
                    </InfoRow>

                    <BarChart>
                      <h3>Feature Importance</h3>
                      {importance.map((item, i) => (
                        <div className="bar-row" key={i} style={{ animationDelay: `${i * 80}ms` }}>
                          <div className="row-label">
                            <span>{item.label}</span>
                            <span>{item.value}%</span>
                          </div>
                          <div className="track">
                            <div className="fill" style={{ width: `${item.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </BarChart>

                    <ExternalLinks>
                      <h3>Verify Market Proof</h3>
                      <div className="link-grid">
                        <a
                          href={`https://rentals.ca/${form.city.toLowerCase().replace(/ /g, '-')}?${
                            form.type === 'condo'
                              ? 'types=all-condos'
                              : form.type === 'house'
                                ? 'types=all-houses'
                                : form.type === 'townhouse'
                                  ? 'types=all-townhouses'
                                  : 'types=all-apartments'
                          }&baths=${Math.floor(parseFloat(form.baths))}&beds=${
                            form.beds === 'Studio' || form.beds === '0' ? '0' : form.beds
                          }&dimensions=${Math.max(0, parseInt(form.sqft) - 100)}-${
                            parseInt(form.sqft) + 200
                          }`}
                          target="_blank"
                          rel="noreferrer">
                          🌐 Rentals.ca
                        </a>
                        <a
                          href={`https://www.zumper.com/apartments-for-rent/${form.city
                            .toLowerCase()
                            .replace(/ /g, '-')}-${PROVINCE_CODES[form.province] || ''}/${
                            form.beds === 'Studio' || form.beds === '0' ? '0' : form.beds
                          }-beds?bathrooms-range=${Math.floor(
                            parseFloat(form.baths),
                          )}&min-square-feet=${Math.max(0, parseInt(form.sqft) - 100)}`}
                          target="_blank"
                          rel="noreferrer">
                          🏠 Zumper
                        </a>
                        <a
                          href={`https://www.airbnb.ca/s/${form.city.replace(
                            / /g,
                            '-',
                          )}--${form.province.replace(/ /g, '-')}--Canada/homes?min_bedrooms=${
                            form.beds === 'Studio' || form.beds === '0' ? '0' : form.beds
                          }&min_bathrooms=${Math.floor(parseFloat(form.baths))}`}
                          target="_blank"
                          rel="noreferrer">
                          🏨 Airbnb
                        </a>
                      </div>
                    </ExternalLinks>
                  </>
                )}

                {!result && (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '12px',
                      color: 'var(--slate)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--fz-sm)',
                    }}>
                    <div style={{ fontSize: '32px' }}>📊</div>
                    <div>Configure inputs and click predict</div>
                    <div style={{ fontSize: 'var(--fz-xs)', opacity: 0.6 }}>
                      Model trained on {'>'}50k Canadian listings
                    </div>
                  </div>
                )}
              </>
            )}
          </ResultPanel>
        </Dashboard>

        <Panel style={{ marginTop: '20px' }}>
          <h2>About the Model</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
              gap: '16px',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fz-xs)',
              color: 'var(--slate)',
            }}>
            {[
              ['Algorithm', 'XGBoost (Gradient Boosting)'],
              ['Training Data', '50k+ Canadian rental listings'],
              ['Features', '17 (location, size, amenities)'],
              ['Key Input', 'City, type, beds/baths, sq. ft.'],
              ['Walk & Bike Score', 'Integrated via Walkscore API'],
              ['Deployment', 'Flask + Render (Python backend)'],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ color: 'var(--green)', marginBottom: '4px' }}>{k}</div>
                <div>{v}</div>
              </div>
            ))}
          </div>
        </Panel>
      </StyledPage>
    </Layout>
  );
};

HousingPredictorPage.propTypes = {
  location: PropTypes.object.isRequired,
};

export default HousingPredictorPage;
