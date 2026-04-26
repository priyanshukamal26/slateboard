# Contributing to Slateboard

First off, thank you for considering contributing to Slateboard! It's people like you who make Slateboard a great tool for educators and students.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Set Up the Project Locally

### Prerequisites
- **Node.js**: v18.x or higher
- **MongoDB**: Local instance or Atlas URI
- **PostgreSQL**: Local instance or Neon/Prisma-compatible URI

### Local Setup
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/priyanshukamal26/slateboard.git
    cd slateboard
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configure environment variables**:
    - Copy `.env.example` to `.env`.
    - Fill in your `MONGODB_URI`, `DATABASE_URL` (PostgreSQL), `GROQ_API_KEY`, and `SESSION_SECRET`.
4.  **Initialize the database**:
    ```bash
    npx prisma migrate dev
    npx prisma generate
    ```
5.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:3000`.

## Development Workflow

### Branch Naming Conventions
- `feature/feature-name` for new features.
- `fix/bug-name` for bug fixes.
- `docs/doc-update` for documentation changes.
- `refactor/change-name` for code refactoring.

### Commit Message Guidelines
We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: add new pen tool`
- `fix: resolve websocket connection drop`
- `docs: update contributing guide`
- `style: linting fixes`

### Code Style
- We use **ESLint** and **Prettier** to maintain code quality.
- Run linting: `npm run lint`
- Auto-format code: `npm run format`

### Testing Expectations
- All new features should include relevant tests in the `tests/` directory.
- Ensure all tests pass before submitting a Pull Request:
  ```bash
  npm test
  ```

## Pull Request Process
1.  Fork the repository and create your branch from `main`.
2.  Ensure your code follows the established style and passes all tests.
3.  Update the documentation if you've added new functionality.
4.  Open a Pull Request with a clear description of the changes and link any related issues.
5.  Once reviewed and approved, your PR will be merged into `main`.

## Questions?
Feel free to open an issue or reach out to the maintainers. Happy coding!
