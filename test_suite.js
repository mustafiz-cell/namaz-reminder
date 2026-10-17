const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('====================================================');
console.log('   NAMAZ REMINDER APP - COMPREHENSIVE TEST SUITE   ');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

// -----------------------------------------------------------------------------
// TEST GROUP 1: Audio Files & Azan-Dua Process Verification
// -----------------------------------------------------------------------------
console.log('🔹 [Test Group 1] Audio Files & Azan-Arabic Dua-Bengali Dua Integrity');

const azanPath = path.join(__dirname, 'azan.mp3');
const duaPath = path.join(__dirname, 'dua.mp3');

assert(fs.existsSync(azanPath), 'azan.mp3 exists on disk');
assert(fs.existsSync(duaPath), 'dua.mp3 exists on disk');

const azanStat = fs.statSync(azanPath);
const duaStat = fs.statSync(duaPath);

assert(azanStat.size > 7000000, `azan.mp3 full filesize verified (${azanStat.size} bytes > 7MB)`);
assert(duaStat.size > 1800000, `dua.mp3 full filesize verified (${duaStat.size} bytes > 1.8MB)`);

// Check that dua.mp3 is the exact audio sequence at the end of azan.mp3
const azanBuf = fs.readFileSync(azanPath);
const duaBuf = fs.readFileSync(duaPath);
const matchIndex = azanBuf.indexOf(duaBuf.subarray(0, 1000));

assert(matchIndex !== -1, `dua.mp3 aligns inside azan.mp3 at byte ${matchIndex}`);
assert(matchIndex + duaBuf.length === azanBuf.length, 'dua.mp3 matches exactly to the last byte of azan.mp3 (Full Process: Azan -> Arabic Dua -> Bengali Meaning)');

// -----------------------------------------------------------------------------
// TEST GROUP 2: HTML & JavaScript File Integrity
// -----------------------------------------------------------------------------
console.log('\n🔹 [Test Group 2] HTML & JavaScript File Integrity');

const htmlPath = path.join(__dirname, 'index.html');
assert(fs.existsSync(htmlPath), 'index.html exists');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Check that no duplicate testAzanNotification or other conflicting functions exist
const duplicateMatches = htmlContent.match(/function\s+testAzanNotification\s*\(/g) || [];
assert(duplicateMatches.length <= 1, `No duplicate testAzanNotification functions (found: ${duplicateMatches.length})`);

// Extract JavaScript from index.html
const scriptMatches = htmlContent.match(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi);
assert(scriptMatches && scriptMatches.length > 0, 'index.html contains JavaScript');

let fullScript = '';
for (const tag of scriptMatches) {
  const code = tag.replace(/<\/?script.*?>/gi, '');
  fullScript += code + '\n';
}

// Sandbox execution of index.html JavaScript
const sandbox = {
  console: console,
  document: {
    addEventListener: () => {},
    documentElement: { lang: 'bn' },
    getElementById: () => null,
    querySelectorAll: () => []
  },
  navigator: {},
  localStorage: {
    _store: {},
    getItem(k) { return this._store[k] !== undefined ? this._store[k] : null; },
    setItem(k, v) { this._store[k] = String(v); }
  },
  setInterval: () => {},
  setTimeout: () => {},
  addEventListener: () => {},
  scrollTo: () => {}
};
sandbox.window = sandbox;



let compileSuccess = true;
try {
  vm.createContext(sandbox);
  vm.runInContext(fullScript, sandbox);
} catch (e) {
  compileSuccess = false;
  console.error('Execution error in sandbox:', e);
}

assert(compileSuccess, 'JavaScript in index.html compiles and executes in sandbox without errors');

// -----------------------------------------------------------------------------
// TEST GROUP 3: Complete Bilingual Parity & Digit Localization
// -----------------------------------------------------------------------------
console.log('\n🔹 [Test Group 3] Complete Bilingual Parity & Digit Localization');

assert(sandbox.STRINGS && sandbox.STRINGS.bn && sandbox.STRINGS.en, 'STRINGS object contains both "bn" and "en" dictionaries');

if (sandbox.STRINGS && sandbox.STRINGS.bn && sandbox.STRINGS.en) {
  const bnKeys = Object.keys(sandbox.STRINGS.bn);
  const enKeys = Object.keys(sandbox.STRINGS.en);

  assert(bnKeys.length === enKeys.length, `Dictionary key count matches perfectly (${bnKeys.length} keys in bn, ${enKeys.length} keys in en)`);

  let missingInEn = bnKeys.filter(k => !(k in sandbox.STRINGS.en));
  let missingInBn = enKeys.filter(k => !(k in sandbox.STRINGS.bn));

  assert(missingInEn.length === 0, `All bn keys exist in en (missing: ${missingInEn.join(', ') || 'none'})`);
  assert(missingInBn.length === 0, `All en keys exist in bn (missing: ${missingInBn.join(', ') || 'none'})`);

  // Verify English strings have NO leaked Bengali script characters
  const bengaliRegex = /[\u0980-\u09FF]/;
  let bnLeakInEn = enKeys.filter(k => {
    const val = String(sandbox.STRINGS.en[k]);
    return bengaliRegex.test(val);
  });
  assert(bnLeakInEn.length === 0, `English dictionary is 100% clean of Bengali text (leaks: ${bnLeakInEn.join(', ') || 'none'})`);

  // Verify toLangDigits helper
  sandbox.setLanguage('bn');
  const bnNum = sandbox.toLangDigits(12345);
  assert(bnNum === '১২৩৪৫', `toLangDigits(12345) in Bangla produces "১২৩৪৫" (got: "${bnNum}")`);

  sandbox.setLanguage('en');
  const enNum = sandbox.toLangDigits('১২৩৪৫');
  assert(enNum === '12345', `toLangDigits("১২৩৪৫") in English produces "12345" (got: "${enNum}")`);
}

// -----------------------------------------------------------------------------
// TEST GROUP 4: Astronomical Solar Calculation Engine & Mosque Timings
// -----------------------------------------------------------------------------
console.log('\n🔹 [Test Group 4] Astronomical Solar Calculation Engine & Mosque Sync');

assert(typeof sandbox.calculatePrayerTimes === 'function', 'calculatePrayerTimes function is available');

if (typeof sandbox.calculatePrayerTimes === 'function') {
  const sampleDate = new Date(2026, 9, 17); // 17 October 2026
  const timesDhaka = sandbox.calculatePrayerTimes(sampleDate, 23.8103, 90.4125, 6, 1, 'karachi');

  assert(timesDhaka && typeof timesDhaka.fajr === 'number', 'Prayer times computed for Dhaka sample input');
  assert(timesDhaka.fajr > 4 && timesDhaka.fajr < 6, `Fajr (${timesDhaka.fajr.toFixed(2)}h) is in valid dawn range`);
  assert(timesDhaka.sunrise > timesDhaka.fajr, 'Sunrise is after Fajr');
  assert(timesDhaka.dhuhr > timesDhaka.sunrise, 'Dhuhr is after Sunrise');
  assert(timesDhaka.asr > timesDhaka.dhuhr, 'Asr is after Dhuhr');
  assert(timesDhaka.maghrib > timesDhaka.asr, 'Maghrib is after Asr');
  assert(timesDhaka.isha > timesDhaka.maghrib, 'Isha is after Maghrib');

  // Verify Hanafi Asr vs Shafi Asr
  const timesShafi = sandbox.calculatePrayerTimes(sampleDate, 23.8103, 90.4125, 6, 0, 'karachi');
  assert(timesDhaka.asr > timesShafi.asr, `Hanafi Asr (${timesDhaka.asr.toFixed(2)}h) is later than Shafi Asr (${timesShafi.asr.toFixed(2)}h)`);

  // Verify Qibla Angle for Dhaka (True geodetic forward azimuth is ~278°)
  const qiblaDhaka = sandbox.calculateQibla(23.8103, 90.4125);
  assert(qiblaDhaka >= 275 && qiblaDhaka <= 280, `Qibla angle for Dhaka is accurate (~278°, got: ${qiblaDhaka}°)`);

  // Verify Mosque Schedule overriding
  sandbox.mosqueSchedule.enabled = true;
  sandbox.mosqueSchedule.dhuhr = "13:00";
  const mosqueDhuhrDec = sandbox.parseTimeToDec(sandbox.mosqueSchedule.dhuhr);
  assert(mosqueDhuhrDec === 13.0, 'Mosque Dhuhr time parsed to 13.0 (1:00 PM)');

  sandbox.setLanguage('bn');
  const formattedDhuhrBn = sandbox.formatTime(mosqueDhuhrDec);
  assert(formattedDhuhrBn.includes('দুপুর') && (formattedDhuhrBn.includes('১:০০') || formattedDhuhrBn.includes('০১:০০')), `Bangla time formatting produces authentic period ("${formattedDhuhrBn}")`);

  sandbox.setLanguage('en');
  const formattedDhuhrEn = sandbox.formatTime(mosqueDhuhrDec);
  assert((formattedDhuhrEn.includes('1:00') || formattedDhuhrEn.includes('01:00')) && formattedDhuhrEn.includes('PM'), `English time formatting produces standard AM/PM ("${formattedDhuhrEn}")`);
}

// -----------------------------------------------------------------------------
// TEST GROUP 5: Audio Phase Transition Constants
// -----------------------------------------------------------------------------
console.log('\n🔹 [Test Group 5] Audio Phase Transition Constants');

assert(sandbox.DUA_START_TIME >= 235 && sandbox.DUA_START_TIME <= 236, `DUA_START_TIME is set to ~235.7s (Azan -> Arabic Dua transition point)`);
assert(sandbox.DUA_MEANING_TIME >= 269 && sandbox.DUA_MEANING_TIME <= 271, `DUA_MEANING_TIME is set to ~270s (Arabic Dua -> Bengali Meaning transition point)`);
assert(sandbox.TOTAL_AUDIO_TIME >= 311 && sandbox.TOTAL_AUDIO_TIME <= 313, `TOTAL_AUDIO_TIME is set to ~312s (Full track completion)`);

// -----------------------------------------------------------------------------
// TEST GROUP 6: Live HTTP Server & Sample Input Delivery Verification
// -----------------------------------------------------------------------------
console.log('\n🔹 [Test Group 6] Live HTTP Server & Sample Request Verification');

const http = require('http');

const testServer = http.createServer((req, res) => {
  const parsedUrl = req.url.split('?')[0];
  const targetFile = parsedUrl === '/' ? 'index.html' : parsedUrl.substring(1);
  const targetPath = path.join(__dirname, targetFile);

  if (!fs.existsSync(targetPath)) {
    res.writeHead(404);
    return res.end('Not Found');
  }

  const stat = fs.statSync(targetPath);
  const range = req.headers.range;

  if (range && targetFile.endsWith('.mp3')) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    res.writeHead(206, {
      'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'audio/mpeg'
    });
    fs.createReadStream(targetPath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': targetFile.endsWith('.html') ? 'text/html' : (targetFile.endsWith('.js') ? 'application/javascript' : 'audio/mpeg')
    });
    fs.createReadStream(targetPath).pipe(res);
  }
});

testServer.listen(8092, async () => {
  function makeRequest(path, headers = {}) {
    return new Promise((resolve, reject) => {
      http.get({ hostname: 'localhost', port: 8092, path: path, headers: headers }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
      }).on('error', reject);
    });
  }

  try {
    const htmlRes = await makeRequest('/');
    assert(htmlRes.statusCode === 200, 'HTTP GET / returns status 200 OK');
    assert(htmlRes.body.includes('<!DOCTYPE html>'), 'HTTP response contains valid HTML5 document');
    assert(htmlRes.body.includes('আযান ও দোয়া'), 'HTML contains Azan & Dua center');

    const rangeRes = await makeRequest('/azan.mp3', { 'Range': 'bytes=0-1023' });
    assert(rangeRes.statusCode === 206, 'HTTP GET /azan.mp3 with Range header returns 206 Partial Content');

    const duaRes = await makeRequest('/dua.mp3');
    assert(duaRes.statusCode === 200, 'HTTP GET /dua.mp3 returns 200 OK');

    testServer.close(() => {
      printSummary();
    });
  } catch (err) {
    console.error('HTTP test error:', err);
    testServer.close(() => process.exit(1));
  }
});

function printSummary() {
  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED:      ${passedTests}`);
  console.log(`FAILED:      ${failedTests}`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY WITH ZERO ERRORS!\n');
    process.exit(0);
  }
}

