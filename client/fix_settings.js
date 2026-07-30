const fs = require('fs');
const path = 'src/components/SettingsView.jsx';
let src = fs.readFileSync(path, 'utf8');

// Show raw bytes around the known bad line ranges so we can see exactly what is there
function showSlice(label, start, end) {
  const slice = src.slice(start, end);
  console.log(label + ':', JSON.stringify(slice));
}

const idx1 = src.indexOf("toast.success('Local backup created successfully!', { icon: '??' })");
const idx2 = src.indexOf("toast.success('Restored previous backup file', { icon: '??' })");
const idx3 = src.indexOf('dev.browser');
const statusIdx = src.indexOf('log.status');

showSlice('backup1', idx1 - 20, idx1 + 120);
showSlice('backup2', idx2 - 20, idx2 + 120);
if (idx3 >= 0) showSlice('device', idx3 - 20, idx3 + 120);
if (statusIdx >= 0) showSlice('status', statusIdx - 20, statusIdx + 120);
