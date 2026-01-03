# Contribution Guide

Thanks for your interest in **Repomix**! 🚀 We'd love your help to make it even better. Here's how you can get involved:


- **Create an Issue**: Spot a bug? Have an idea for a new feature? Let us know by creating an issue.
- **Submit a Pull Request**: Found something to fix or improve? Jump in and submit a PR!
- **Spread the Word**: Share your experience with Repomix on social media, blogs, or with your tech community.
- **Use Repomix**: The best feedback comes from real-world usage, so feel free to integrate Repomix into your own projects!

## Maintainers

Repomix is maintained by Yamadashy ([@yamadashy](https://github.com/yamadashy)). While all contributions are welcome, please understand that not every suggestion may be accepted if they don't align with the project's goals or coding standards.

---

## Pull Requests

Before submitting a Pull Request, please ensure:

1. Your code passes all tests: Run `npm run test`
2. Your code adheres to our linting standards: Run `npm run lint`
3. You have updated relevant documentation (especially README.md) if you've added or changed functionality.

## Local Development

To set up Repomix for local development:

```bash
git clone https://github.com/yamadashy/repomix.git
cd repomix
npm install
```

To run Repomix locally:

```bash
npm run repomix
```

### Docker Usage
You can also run Repomix using Docker. Here's how:

First, build the Docker image:
```bash
docker build -t repomix .
```

Then, run the Docker container:
```bash
docker run -v ./:/app -it --rm repomix
```

### Coding Style

We use [Biome](https://biomejs.dev/) for linting and formatting. Please make sure your code follows the style guide by running:

```bash
npm run lint
```

### Testing

We use [Vitest](https://vitest.dev/) for testing. To run the tests:

```bash
npm run test
```

For test coverage:

```bash
npm run test-coverage
```

### Documentation

When adding new features or making changes, please update the relevant documentation in the README.md file.

### Website Development

The Repomix website is built with [VitePress](https://vitepress.dev/). To run the website locally:

```bash
# Prerequisites: Docker must be installed on your system

# Start the website development server
npm run website

# Access the website at http://localhost:5173/
```

The website source code is located in the `website` directory. The main components are:

- `website/client`: Frontend code (Vue.js components, styles, etc.)
- `website/server`: Backend API server

When updating documentation, contributors only need to update the README.md file.
The maintainers will handle the website documentation updates.

## Releasing

New versions are managed by the maintainer. If you think a release is needed, open an issue to discuss it

Thank you for contributing to Repomix!
