require('dotenv').config();
const {NodeSSH} = require('node-ssh');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const readline = require('readline');
const axios = require('axios');

const ssh = new NodeSSH();

const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_USER = process.env.SERVER_USER;
const SERVER_PASSWORD = process.env.SERVER_PASSWORD;
const WP_PATH = process.env.WP_PATH;
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_API_ENDPOINT = process.env.LLM_API_ENDPOINT;
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS, 10);
const TEMPERATURE = parseFloat(process.env.TEMPERATURE);

const PAGES_TO_TEST = [process.env.HOMEPAGE_URL, process.env.PRODUCT_PAGE_URL, process.env.CART_PAGE_URL];

let shouldStop = false;
let plugins = [];
let baselinePerformance = {};
let performanceImpact = {};
let currentIteration = 0;
let startTime;

function saturnSays(message) {
  console.log(`🪐 Saturn Engine: ${message}`);
}

function printPlugins(plugins) {
  console.log('\nCurrent Plugin List:');
  plugins.forEach((plugin, index) => {
    console.log(`${index + 1}. ${plugin.name} (${plugin.status})`);
  });
  console.log('');
}

function printActivePlugins(plugins) {
  const activePlugins = plugins.filter((plugin) => plugin.status === 'active');
  console.log('\nCurrently Active Plugins:');
  activePlugins.forEach((plugin, index) => {
    console.log(`${index + 1}. ${plugin.name}`);
  });
  console.log('');
}

async function connectToServer() {
  saturnSays('Initiating connection to the WordPress server... 🚀');
  await ssh.connect({
    host: SERVER_HOST,
    username: SERVER_USER,
    password: SERVER_PASSWORD,
  });
  saturnSays('Successfully connected to the server! 🎉');
}

async function runWpCliCommand(command) {
  saturnSays(`Executing WP-CLI command: ${command} 🛠️`);
  const result = await ssh.execCommand(`wp ${command}`, {cwd: WP_PATH});
  return result.stdout.trim();
}

async function getPluginList() {
  saturnSays('Fetching the list of installed plugins... 🔍');
  const pluginsJson = await runWpCliCommand('plugin list --format=json');
  return JSON.parse(pluginsJson);
}

async function runLighthouse(url) {
  saturnSays(`Launching Chrome for Lighthouse test on ${url} 🚀`);
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance'],
    port: chrome.port,
  };
  const runnerResult = await lighthouse(url, options);
  await chrome.kill();
  saturnSays(`Lighthouse test completed for ${url} 🏁`);
  return JSON.parse(runnerResult.report);
}

async function testPerformance(pages) {
  const results = {};
  for (const page of pages) {
    saturnSays(`Testing performance for: ${page} 🧪`);
    try {
      const lighthouseResult = await runLighthouse(page);
      const performanceScore = lighthouseResult.categories.performance.score * 100;
      results[page] = performanceScore;
      saturnSays(`Performance score for ${page}: ${performanceScore.toFixed(2)} points 📊`);
    } catch (error) {
      console.error(`Error testing ${page}:`, error);
      results[page] = 'Error';
      saturnSays(`Oops! We encountered an error while testing ${page} 😓`);
    }
  }
  return results;
}

function comparePerformance(baseline, current) {
  const comparison = {};
  for (const page in baseline) {
    if (baseline[page] !== 'Error' && current[page] !== 'Error') {
      const diff = current[page] - baseline[page];
      comparison[page] = {
        diff: diff.toFixed(2),
        faster: diff > 0,
        baseline: baseline[page].toFixed(2),
        current: current[page].toFixed(2),
      };
    } else {
      comparison[page] = 'Error';
    }
  }
  return comparison;
}

function saveProgress() {
  const progress = {
    plugins,
    baselinePerformance,
    performanceImpact,
    currentIteration,
  };
  fs.writeFileSync('progress.json', JSON.stringify(progress, null, 2));
  saturnSays('Progress saved! You can resume later using the --resume flag. 💾');
}

function loadProgress() {
  if (fs.existsSync('progress.json')) {
    const progress = JSON.parse(fs.readFileSync('progress.json', 'utf8'));
    plugins = progress.plugins;
    baselinePerformance = progress.baselinePerformance;
    performanceImpact = progress.performanceImpact;
    currentIteration = progress.currentIteration;
    saturnSays('Previous progress loaded! Resuming from where we left off. 🔄');
    return true;
  }
  return false;
}

function calculateProgress(current, total) {
  const percentage = (current / total) * 100;
  return percentage.toFixed(2);
}

function estimateRemainingTime(elapsed, current, total) {
  const remainingIterations = total - current;
  const averageTimePerIteration = elapsed / current;
  const remainingTimeSeconds = remainingIterations * averageTimePerIteration;
  const hours = Math.floor(remainingTimeSeconds / 3600);
  const minutes = Math.floor((remainingTimeSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

async function analyzeFinalOutput(performanceImpact) {
  const prompt = `Analyze the following performance impact data for WordPress plugins and provide a prioritized list of plugins to consider deactivating for best performance improvement. Include brief explanations for each recommendation:

${JSON.stringify(performanceImpact, null, 2)}`;

  try {
    const response = await axios.post(
      LLM_API_ENDPOINT,
      {
        prompt,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        model: 'claude-2.0',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': LLM_API_KEY,
        },
      }
    );

    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error('Error calling LLM API:', error);
    return 'Unable to generate recommendations due to an error.';
  }
}

async function main(resume = false) {
  try {
    saturnSays("Welcome to the WordPress Plugin Performance Testing v1.0! Let's get started! 🚀");

    if (resume && loadProgress()) {
      saturnSays('Resuming from previous session...');
    } else {
      await connectToServer();
      plugins = await getPluginList();
      printPlugins(plugins);

      saturnSays("Now, let's establish our baseline performance... 📏");
      baselinePerformance = await testPerformance(PAGES_TO_TEST);
      saturnSays('Baseline performance established! 🎯');
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on('line', (input) => {
      if (input.toLowerCase() === 'stop') {
        shouldStop = true;
        saturnSays("Received stop command. We'll finish the current test and then stop. 🛑");
      }
    });

    startTime = Date.now();

    for (let i = currentIteration; i < plugins.length; i++) {
      if (shouldStop) {
        saturnSays("Stopping as requested. Here's what we've got so far:");
        break;
      }

      const plugin = plugins[i];
      if (plugin.status === 'active') {
        console.log('\n' + '='.repeat(50));
        console.log(`ITERATION ${i + 1}: Testing plugin ${plugin.name}`);
        console.log('='.repeat(50) + '\n');

        const progress = calculateProgress(i + 1, plugins.length);
        const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
        const estimatedTimeRemaining = estimateRemainingTime(elapsedTime, i + 1, plugins.length);

        saturnSays(`Progress: ${progress}% complete`);
        saturnSays(`Estimated time remaining: ${estimatedTimeRemaining}`);

        saturnSays(`Now testing plugin: ${plugin.name} 🔌`);
        printPlugins(plugins);
        printActivePlugins(plugins);

        saturnSays(`Deactivating ${plugin.name}... 🔽`);
        await runWpCliCommand(`plugin deactivate ${plugin.name}`);

        saturnSays('Waiting for changes to take effect... ⏳');
        await new Promise((resolve) => setTimeout(resolve, 5000));

        saturnSays(`Testing performance without ${plugin.name}... 🧪`);
        const currentPerformance = await testPerformance(PAGES_TO_TEST);

        saturnSays(`Calculating performance impact of ${plugin.name}... 🧮`);
        const performanceComparison = comparePerformance(baselinePerformance, currentPerformance);
        performanceImpact[plugin.name] = performanceComparison;

        console.log('\nPerformance Comparison:');
        for (const [page, comparison] of Object.entries(performanceComparison)) {
          if (comparison !== 'Error') {
            console.log(`${page}:`);
            console.log(`  Baseline: ${comparison.baseline} points`);
            console.log(`  Current: ${comparison.current} points`);
            console.log(`  Difference: ${comparison.diff} points (${comparison.faster ? 'faster ⚡' : 'slower 🐢'})`);
          } else {
            console.log(`${page}: Error occurred during testing`);
          }
        }

        saturnSays(`Reactivating ${plugin.name}... 🔼`);
        await runWpCliCommand(`plugin activate ${plugin.name}`);

        saturnSays('Waiting for changes to take effect... ⏳');
        await new Promise((resolve) => setTimeout(resolve, 5000));

        currentIteration = i + 1;
        saveProgress();
      }
    }

    rl.close();
    ssh.dispose();
    saturnSays('Disconnected from the server. All tests completed! 🎉');

    saturnSays("Now, let's sort the results and see which plugins have the biggest impact... 📊");
    const sortedImpact = Object.entries(performanceImpact).sort((a, b) => {
      const sumA = Object.values(a[1]).reduce(
        (sum, comparison) => sum + (comparison !== 'Error' ? parseFloat(comparison.diff) : 0),
        0
      );
      const sumB = Object.values(b[1]).reduce(
        (sum, comparison) => sum + (comparison !== 'Error' ? parseFloat(comparison.diff) : 0),
        0
      );
      return sumB - sumA;
    });

    saturnSays("Here's the performance impact of each plugin:");
    for (const [plugin, impact] of sortedImpact) {
      console.log(`\n${plugin}:`);
      for (const [page, comparison] of Object.entries(impact)) {
        if (comparison !== 'Error') {
          console.log(`  ${page}:`);
          console.log(`    Baseline: ${comparison.baseline} points`);
          console.log(`    Without plugin: ${comparison.current} points`);
          console.log(`    Impact: ${comparison.diff} points (${comparison.faster ? 'faster ⚡' : 'slower 🐢'})`);
        } else {
          console.log(`  ${page}: Error occurred during testing`);
        }
      }
      const overallImpact = Object.values(impact).reduce(
        (sum, comparison) => sum + (comparison !== 'Error' ? parseFloat(comparison.diff) : 0),
        0
      );
      console.log(`  Overall impact: ${overallImpact.toFixed(2)} points`);
    }

    saturnSays('Analyzing results with our AI assistant... 🤖');
    const aiRecommendations = await analyzeFinalOutput(performanceImpact);
    console.log('\nAI Recommendations:');
    console.log(aiRecommendations);

    saturnSays("That's all, folks! Hope this information helps you optimize your WordPress site! 🚀🌟");
  } catch (error) {
    saturnSays(`Oh no! We've encountered an unexpected error: ${error} 😱`);
    console.error('Error details:', error);
  }
}

const args = process.argv.slice(2);
const resume = args.includes('--resume');

main(resume);
