const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ITEMS_FILE = path.join(__dirname, 'data', 'tunnel_items.json');

function getTunnelItems() {
  try {
    if (fs.existsSync(ITEMS_FILE)) {
      return JSON.parse(fs.readFileSync(ITEMS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading tunnel items:', err);
  }
  return [];
}

function saveTunnelItems(items) {
  try {
    fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving tunnel items:', err);
    return false;
  }
}

const clubData = {
  name: 'Interact Club of BDU STEM Center',
  shortName: 'Interact BDU STEM',
  location: 'Bahir Dar, Ethiopia',
  motto: 'Service Above Self',
  sponsor: 'Rotary Club of Bahir Dar, District 9212',
  about: {
    tagline: 'High school students leading with purpose and serving our community.',
    story: 'We are high school students based at the Bahir Dar University STEM Center, united by a shared commitment to service and leadership. Sponsored by the Rotary Club of Bahir Dar and part of the global Rotary International network, our club brings young people together to create meaningful community projects and make a positive difference across Bahir Dar.',
    mission: 'To empower high school students to grow as leaders, take creative initiative, and serve our local community through Service Above Self.',
    vision: 'A vibrant, student-led community where young people discover their potential, serve with empathy, and build lasting positive change in Bahir Dar.',
    metrics: [
      { val: '0', label: 'Active High School Members' },
      { val: '0', label: 'Community Service Projects' },
      { val: '0', label: 'Youth Leadership Initiatives' },
      { val: '0', label: 'Global Rotary Family' }
    ]
  },
  projects: [
    { num: '', tag: '', title: '', desc: '', tech: [], impact: '' },
    { num: '', tag: '', title: '', desc: '', tech: [], impact: '' },
    { num: '', tag: '', title: '', desc: '', tech: [], impact: '' },
    { num: '', tag: '', title: '', desc: '', tech: [], impact: '' }
  ],
  contact: {
    email: '..',
    phone: '..',
    location: 'BDU STEM Center, Main Campus, Bahir Dar, Ethiopia',
    telegram: '..',
    meetingTime: 'Saturdays from 9:00 AM to 11:30 AM at Hall B'
  }
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/static', express.static(path.join(__dirname, 'static')));

app.get('/', (req, res) => {
  const tunnelItems = getTunnelItems();
  res.render('index', { club: clubData, tunnelItems });
});

app.get('/api/tunnel-items', (req, res) => {
  res.json({ success: true, items: getTunnelItems() });
});

app.post('/api/tunnel-items', (req, res) => {
  const { type, title, kicker, sub, desc, badge } = req.body;
  if (!title || !desc) {
    return res.status(400).json({ success: false, error: 'Title and description are required' });
  }

  const items = getTunnelItems();
  // Assign a particle index distributed along the remaining resting particles (e.g. 50-380)
  const existingIndices = new Set(items.map(it => it.pIdx));
  let candidateIdx = 300;
  for (let cand = 40; cand < 400; cand += 25) {
    if (!existingIndices.has(cand)) {
      candidateIdx = cand;
      break;
    }
  }

  const isLeft = items.length % 2 === 1;
  const newItem = {
    id: 'item-' + Date.now(),
    type: type || 'moment',
    badge: badge || (type === 'project' ? '💡 Project' : '📸 Moment'),
    kicker: kicker || (type === 'project' ? 'New Initiative' : 'Club Memory'),
    title: title.trim(),
    sub: sub ? sub.trim() : '',
    desc: desc.trim(),
    pIdx: candidateIdx,
    side: isLeft ? 'left' : 'right'
  };

  items.push(newItem);
  saveTunnelItems(items);
  res.json({ success: true, item: newItem });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
