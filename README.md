# WordPress Plugin Performance Test v1.0

This project provides a tool to test the performance impact of WordPress plugins on your server. It automates the process of activating and deactivating plugins while measuring page load times using Google Lighthouse.

## Features

- Connects to your WordPress server via SSH
- Retrieves a list of all installed plugins using WP-CLI
- Measures baseline performance of specified pages using Google Lighthouse
- Systematically deactivates each plugin and measures performance impact
- Calculates and reports the performance difference for each plugin
- Sorts plugins by their overall performance impact
- Includes Saturn Engine, a friendly helper that provides updates and uses emojis to make the process more engaging
- Displays a list of fetched plugins at the beginning and after every iteration
- Shows a visible headline for each iteration with the plugin currently being tested
- Compares current test results to the initial baseline, indicating if it's faster or slower
- Lists currently activated plugins for each test
- Allows graceful stopping of the process with preliminary output
- Supports full restart and resume functionality

## Prerequisites

- macOS (the setup script uses Homebrew which is macOS-specific)
- Command line tools (Xcode) installed

## Installation

1. Clone this repository:

   ```
   git clone https://github.com/your-username/wp-plugin-performance-test.git
   cd wp-plugin-performance-test
   ```

2. Run the setup script:

   ```
   chmod +x setup.sh
   ./setup.sh
   ```

   This script will:

   - Install Homebrew (if not already installed)
   - Create a Brewfile (if it doesn't exist)
   - Install necessary dependencies (including Node.js and Google Chrome)
   - Install Node.js dependencies
   - Create a .env file from .env-example (if it doesn't exist)

3. Configure your environment:
   Edit the `.env` file with your specific WordPress server details:
   ```
   nano .env
   ```

## Usage

1. Ensure your `.env` file is correctly configured with your WordPress server details and test URLs.

2. Run the performance test:

   ```
   npm start
   ```

3. Saturn Engine, our friendly helper, will guide you through the process with emoji-filled updates.

4. To stop the process gracefully at any time, type 'stop' and press Enter. The script will finish the current test and provide preliminary results.

5. To resume a previously stopped session:

   ```
   npm start -- --resume
   ```

6. At the end of the test, the script will output the performance impact of each plugin, sorted by overall impact.

## Interpreting Results

The script will output a performance impact score for each plugin on each tested page. A positive percentage indicates improved performance (faster), while a negative percentage indicates decreased performance (slower).

Example output:

```
plugin-name:
  http://your-domain.com: 5.23% faster ⚡
  http://your-domain.com/product/sample-product: -2.45% slower 🐢
  http://your-domain.com/cart: 1.67% faster ⚡
  Overall impact: 4.45%
```

In this example, the plugin improved overall performance by 4.45%, with varied impact on different pages.

## Troubleshooting

If you encounter any issues during setup or execution:

1. Ensure you're running the script on macOS, as the setup relies on Homebrew.
2. Make sure you have the latest version of the code and have run the setup script.
3. Check that your `.env` file is correctly configured with valid WordPress server details.
4. Ensure your WordPress server has WP-CLI installed and is accessible via SSH.
5. If you encounter a "ECONNREFUSED" error related to Chrome:
   - Make sure Google Chrome is installed on your system.
   - Try running the script with sudo: `sudo npm start`
   - If the issue persists, try manually installing Chrome using Homebrew:
     ```
     brew install --cask google-chrome
     ```
   - Ensure your firewall isn't blocking Chrome or Node.js.

If you're still experiencing issues, please check the Chrome installation on your system and ensure it's up to date.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
