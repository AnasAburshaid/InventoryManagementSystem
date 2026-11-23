## 1. Project Mission

This repository contains an Inventory and Warehouse Management System.

The goal is to build a reliable, maintainable application for managing products, categories, brands, suppliers, warehouses, warehouse assignments, purchasing, sales, stock movements, and inventory transfers.

The system is designed around:
- ASP.NET Core Web API on .NET 8.
- C#.
- Entity Framework Core.
- Microsoft SQL Server.
- Clean Architecture.
- MediatR for application use cases where already adopted.
- FluentValidation for request validation where already adopted.
- JWT authentication and role/resource-based authorization.
- A React frontend.

**First rule:** Inspect the actual repository before making assumptions. This document describes the intended architecture and known project decisions, but the current source code is the final authority for exact file names, namespaces, package versions, routes, and implementation details.

## 2. How Agents Must Work

Act as a careful senior software engineer working in an existing codebase—not as a code generator starting a new project.

For every task:

1. Read the relevant code before proposing or making changes.
2. Trace the complete execution path affected by the task:
   - API endpoint or frontend interaction.
   - Application use case/service/handler.
   - Domain rules and entities.
   - Infrastructure and persistence.
   - Authorization and validation.
   - Related tests.
3. Identify existing conventions and follow them.
4. Make the smallest coherent change that solves the requested problem.
5. Avoid unrelated refactoring, renaming, formatting, package upgrades, or architectural changes.
6. Add or update tests for changed behavior.
7. Run the most relevant tests, then the broader test suite when practical.
8. Review the final diff for unintended changes.
9. Report exactly what changed, what was tested, and anything not verified.

Do not claim a command, test, build, migration, deployment, or manual verification succeeded unless it was actually executed and its result was observed.

### Before editing

- Check `git status` and preserve the user's uncommitted work.
- Do not overwrite, reset, discard, or reformat unrelated user changes.
- Inspect project files and existing patterns instead of guessing.
- If requirements are ambiguous in a way that could change business behavior or data integrity, ask one focused question before implementing.
- If a safe implementation is possible without clarification, state the assumption and proceed.

### While editing

- Prefer focused, reviewable changes.
- Keep code readable and explicit.
- Avoid introducing abstractions for hypothetical future requirements.
- Do not duplicate existing functionality.
- Do not silently change public API contracts, database schema, authorization behavior, or business rules.
- Do not add a NuGet/npm dependency unless it provides clear value and is necessary for the task. Explain why it is needed.
- Never hardcode credentials, signing keys, tokens, connection strings, or other secrets.

### After editing

- Run formatting/build/tests appropriate to the change.
- Inspect `git diff` and `git status`.
- Check that no secrets, local database files, build output, or unrelated files were added.
- Summarize:
  - What changed.
  - Why it changed.
  - Tests and commands actually run.
  - Results.
  - Known limitations or follow-up work.

## 3. Environment Variables, `.env`, and AI Model Configuration

The repository may contain a local `.env` file with development configuration and API credentials.

### `.env` usage

- If a `.env` file exists, you are allowed to read the required API key from it and use it for the task when the relevant tool or service is configured to do so.
- Inspect the existing `.env.example`, configuration code, and environment-variable names before using a value. Do not guess variable names.
- Never print, echo, expose, copy into source code, commit, or include secret values in logs, screenshots, test output, documentation, prompts, or final reports.
- Never send a secret to the frontend or expose it through a `VITE_`, `NEXT_PUBLIC_`, or other client-exposed environment variable.
- Ensure `.env` is excluded by `.gitignore`. If it is not, flag the issue and protect the secret; do not commit the file.
- Do not overwrite or modify existing credentials.
- Do not create, rotate, revoke, or replace API keys without explicit user authorization.
- If a required key is missing or invalid, report that clearly. Do not invent a key or silently switch to another provider.

### Preferred AI model

When a project task requires an AI model through the configured AI provider (for example, an OpenRouter-compatible integration), use this model identifier:

`nvidia/nemotron-3-ultra-550b-a55b:free`

Rules:

- Use the identifier exactly as written when configuring the model.
- First inspect the existing provider integration and its expected configuration. Do not assume the provider, endpoint, or environment-variable name.
- Keep the API key server-side and load it from the existing `.env` / environment configuration.
- Do not hardcode the API key or model credentials.
- If the configured provider does not support this model or the model is unavailable, report the incompatibility instead of silently substituting another model.
- Do not add an AI integration to a task that does not require one.

## 4. Architecture and Boundaries

The backend follows Clean Architecture with the existing layers generally organized as:

- **Domain**: business entities, value objects, enums, and domain rules.
- **Application**: use cases, commands/queries, handlers, DTOs, validation, and application interfaces.
- **Infrastructure / Data Access**: EF Core, `DbContext`, entity configurations, repositories or persistence implementations, and external integrations.
- **API / Presentation**: controllers or endpoints, authentication configuration, middleware, dependency injection composition, and HTTP concerns.

Use the repository's actual project and namespace names; do not create a second architecture alongside the existing one.

### Dependency direction

- Domain must not depend on Application, Infrastructure, API, or frontend projects.
- Application should depend on Domain and abstractions, not concrete infrastructure implementations.
- Infrastructure implements application/domain-facing persistence and integration abstractions.
- API is the composition and HTTP boundary.
- Keep business decisions out of controllers and frontend components.

Do not move code between layers just to make a change appear more "Clean Architecture." Make changes only when the current boundary is genuinely violated or the task requires it.

## 5. Backend Engineering Rules

- Target the framework version already configured by the repository (known project target: .NET 8).
- Follow existing naming, nullable-reference, async, dependency-injection, and error-handling conventions.
- Use asynchronous EF Core and I/O APIs where appropriate.
- Pass and honor `CancellationToken` in asynchronous application and persistence operations when supported by the existing design.
- Avoid blocking calls such as `.Result` and `.Wait()` in asynchronous request paths.
- Do not expose EF Core entities directly as public API contracts unless the existing endpoint intentionally does so and the task requires preserving it.
- Use request/response DTOs at the API boundary.
- Validate input at the appropriate boundary, but keep critical business invariants enforced in the application/domain layer too.
- Do not treat frontend validation as security or business-rule enforcement.
- Avoid broad exception swallowing. Preserve useful diagnostics and return safe, consistent API errors.
- Do not log passwords, JWTs, secrets, or sensitive personal data.

## 6. Inventory and Stock Domain Rules

These rules are central to the system and must not be weakened without an explicit requirement.

### 6.1 Stock is ledger-based

Stock quantity is derived from stock movement records. The stock movement ledger is the source of truth.

- Do not introduce or use a mutable product/warehouse quantity as a competing source of truth.
- Do not update historical stock movement records to correct stock. Record an appropriate compensating movement instead, following existing business rules.
- Stock history must remain auditable.
- Current stock and stock history calculations must remain consistent with movement direction and movement type.

If a performance optimization introduces a stock balance projection or cache in the future, it must be explicitly designed as a derived, rebuildable representation—not silently treated as the authoritative ledger.

### 6.2 Movement integrity

Preserve the existing movement types, direction rules, and validation behavior.

Examples of important invariants:

- A sale or other outbound movement must not cause available stock to become negative.
- Invalid, zero, or negative quantities must be rejected according to the established API contract.
- Inactive or nonexistent products and warehouses must be handled according to existing business rules.
- Adjustment movements must satisfy the existing reason/note requirements.
- Transfers must be represented consistently at both the source and destination warehouses.
- A failed transfer must not leave only one side of the transfer persisted.

Do not invent new movement types or alter movement semantics without inspecting the domain model and confirming the requirement.

### 6.3 Transactions and concurrency

Stock operations are concurrency-sensitive.

Known project decision:

- Outbound stock operations and transfers use SQL Server transaction/application-lock protection to prevent two concurrent requests from reading the same available stock and overselling it.
- The known implementation uses SQL Server `sp_getapplock` with a resource scoped to the warehouse and product, and transaction ownership.

When modifying stock operations:

1. Inspect the existing transaction and lock implementation first.
2. Ensure the transaction is active before acquiring a transaction-owned application lock.
3. Acquire the relevant lock before reading the stock value used for the decision.
4. Ensure competing operations use the same lock-resource naming convention and compatible database/principal scope.
5. Keep the stock check and movement persistence inside the protected transaction.
6. Ensure failures roll back all related writes.
7. Handle lock timeout, cancellation, and SQL errors safely; do not continue as if the lock was acquired.
8. Avoid broad table locks that unnecessarily block unrelated warehouses or products.
9. Consider lock ordering when an operation touches multiple warehouse/product resources.

Do not remove `sp_getapplock`, weaken its scope, move the stock read before the lock, or replace the transaction strategy without a documented correctness argument and appropriate SQL Server concurrency tests.

**Provider distinction:** EF Core InMemory does not provide SQL Server transaction or application-lock semantics. Passing InMemory tests is not proof that SQL Server concurrency behavior is correct.

## 7. Authentication and Authorization

The application uses JWT authentication and warehouse-scoped authorization.

Known authorization model:

- **Admin** is a global role and can access permitted system-wide operations without a warehouse assignment, according to the existing policy.
- **Employee**, **Supervisor**, and **Manager** are warehouse-local roles.
- Warehouse-local access is based on an active user-to-warehouse assignment.
- Authorization must be evaluated against the warehouse identified by the route/resource, not trusted from a client-supplied body field.

Rules:

- Never rely on frontend route hiding or UI permissions as authorization.
- Never trust a role, user ID, warehouse ID, or permission supplied in an ordinary request body/header unless it is established and validated by the server's authentication/authorization design.
- Preserve the distinction between `401 Unauthorized` (not authenticated) and `403 Forbidden` (authenticated but not permitted), following the established API behavior.
- Check active assignment status when authorizing warehouse-local access.
- Prevent a user assigned to Warehouse A from accessing Warehouse B unless an explicit policy grants that access.
- Keep global Admin behavior separate from warehouse-local roles.
- Do not add Employee, Supervisor, or Manager as global privileges merely to make an endpoint work.
- When changing authorization, test both allowed and denied cases, including cross-warehouse access.

The integration test authentication handler is test infrastructure only. Never use its test headers or fallback identity as production authentication behavior.

## 8. API Design and Compatibility

- Follow existing route, HTTP verb, status-code, DTO, pagination, filtering, and error-response conventions.
- Prefer resource-oriented routes consistent with the existing API.
- For warehouse-scoped operations, preserve the established warehouse route boundary (known pattern: `/api/warehouses/{warehouseId}/...`).
- Validate that route resource IDs and any duplicated body IDs cannot be used to bypass authorization or redirect an operation to another resource.
- Avoid breaking existing frontend/API consumers.
- If an API contract must change, update its callers, tests, and relevant documentation in the same task.
- Do not expose internal exception details or stack traces to clients.

## 9. Database and EF Core

- Inspect `DbContext`, entity configurations, relationships, indexes, constraints, and migrations before changing persistence behavior.
- Prefer explicit database constraints for invariants that must be enforced even if application code is bypassed.
- Add migrations for schema changes; do not edit an already-applied migration to change deployed database history.
- Review generated migrations before applying them.
- Never run destructive database commands against a real, shared, staging, or production database without explicit user authorization.
- Never assume the configured connection string points to a disposable database.
- Do not run `EnsureDeleted`, `EnsureCreated`, database drops, or destructive resets unless the user explicitly authorizes the exact target and action.
- Do not put local database credentials or connection strings in source control.
- Consider indexes and query shape for stock history and current-stock queries.
- Preserve decimal precision appropriate for quantities and monetary values; inspect existing configuration before changing it.

## 10. Testing Strategy

The project uses automated tests, including xUnit, ASP.NET Core `WebApplicationFactory`, HTTP clients, EF Core test persistence, and SQL Server-backed tests for behavior that depends on SQL Server.

Use the test type that matches the risk:

- **Unit tests**: isolated business logic and small components.
- **Integration tests**: API pipeline, authentication/authorization, application services, EF Core persistence, and component interaction.
- **SQL Server integration/concurrency tests**: transaction behavior, `sp_getapplock`, rollback, and concurrent stock operations.
- **End-to-end tests**: complete user workflows across frontend and backend, where configured.

### Test requirements

- Use Arrange–Act–Assert (AAA) to keep tests understandable.
- Keep tests deterministic and independent.
- Use fresh test data/unique identifiers where appropriate.
- Assert meaningful outcomes, not merely that code did not throw.
- Test negative and unauthorized paths as well as successful paths.
- Avoid weakening or deleting a test just to make a build pass.
- Do not replace a SQL Server-specific test with an InMemory test when the behavior under test depends on SQL Server.
- Do not claim concurrency is verified unless the SQL Server-backed concurrency tests actually ran successfully.
- When fixing a bug, add a regression test that would fail before the fix where practical.

Known historical milestone: the project previously reported 57 passing tests across InMemory and SQL Server-backed test scenarios. This is historical context, **not a guarantee of the current test count or current test status**. Always run the current suite and report the observed result.

### Useful commands

Inspect the solution and test projects before choosing exact project paths.

Typical commands:

```bash
dotnet --info
dotnet sln list
dotnet build
dotnet test
```

Run a specific test project when its actual path/name is known:

```bash
dotnet test path/to/Your.IntegrationTests.csproj
```

For frontend work, inspect `package.json` first and use the package manager and scripts already configured by the repository. Do not assume npm, pnpm, or yarn without checking.

## 11. Frontend Rules

The frontend is React-based.

- Inspect the existing component structure, routing, state management, API client, and styling approach before making changes.
- Follow the conventions and libraries already in use.
- Keep API communication in the existing API/service layer rather than scattering raw HTTP calls throughout components.
- Handle loading, empty, success, and error states.
- Do not hardcode production API URLs in components. Use the project's existing environment configuration.
- Never put server secrets, database credentials, JWT signing keys, or privileged tokens in frontend environment variables. Frontend variables are exposed to users in the built application.
- Treat all frontend input and displayed permissions as untrusted from a security perspective; the backend remains authoritative.
- Keep warehouse context explicit when calling warehouse-scoped endpoints.
- Avoid unrelated UI redesigns or broad component rewrites.

## 12. Design and Frontend Skills

Before doing frontend design or substantial UI work—including page layouts, visual styling, responsive behavior, design systems, component styling, animations, or UX refinement—inspect the skills available in the environment.

- Search for relevant installed skills first, especially frontend design, UI/UX, accessibility, and React implementation skills.
- Read the full instructions for each relevant skill before starting the design or implementation.
- Follow the skill's workflow, constraints, and reference materials where applicable.
- If multiple skills are relevant, use the most directly applicable ones and avoid loading unrelated skills.
- Do not assume a skill is installed. If no relevant skill is available, proceed using the repository's existing design conventions and clearly mention that no applicable skill was found.
- Skills are guidance, not permission to ignore this file's architecture, security, accessibility, or scope requirements.

## 12.1 Design Tools: Figma and Mobbin

The project uses **Figma** and **Mobbin** as design resources.

### Figma
- Use Figma for UI design, screen layouts, design systems, components, and prototypes.
- Before implementing a major frontend screen, check whether a relevant Figma design already exists.
- Follow the approved design's layout, spacing, typography, colors, and component structure.
- Do not invent a completely different design when an approved design is available.
- If a design needs improvement, explain the proposed changes before significantly deviating from it.

### Mobbin
- Use Mobbin as a reference library for studying professional UI patterns and real-world application designs.
- Look for relevant examples of dashboards, navigation, forms, tables, authentication screens, and other components.
- Use references for inspiration, not direct copying.
- Adapt patterns to the project's requirements and maintain a consistent visual identity.

### Design Workflow
1. Research relevant UI patterns in Mobbin.
2. Create or refine the design in Figma when appropriate.
3. Implement the approved design in React.
4. Use the installed frontend design skills to review and polish the implementation.
5. Check responsiveness, accessibility, consistency, and usability.

**Important:** Figma is the design workspace; Mobbin is the inspiration and reference source. Do not assume either tool has an available agent integration or API unless it has been verified.

## 13. Configuration, Security, and Deployment

The application may run locally, in test environments, and in production. Keep environment-specific configuration separate.

Before a deployment-related change:

- Inspect the existing hosting and deployment configuration.
- Confirm production connection strings and secrets are supplied through the hosting platform's secure configuration.
- Confirm JWT signing keys are strong, private, and configured outside source control.
- Configure CORS for the actual frontend origin rather than allowing every origin by default.
- Require HTTPS in production.
- Review Swagger exposure and authentication requirements for the intended environment.
- Confirm EF Core migrations are applied safely to the target database.
- Verify that the production database supports the SQL Server features used by the application, especially `sp_getapplock`.
- Configure useful logging and health checks without leaking secrets.
- Confirm backups and a tested restore procedure for any real business data.

Do not deploy, change DNS, alter cloud resources, incur paid services, or run production migrations without explicit user approval.

## 14. Documentation

When a change affects behavior, architecture, setup, API contracts, environment configuration, or deployment, update the relevant documentation if it exists.

Documentation should explain:

- What the feature does.
- Important business rules.
- Required configuration.
- How to run or test it.
- Any operational or migration considerations.

Do not generate documentation that claims unsupported behavior. Keep examples consistent with the actual code.

## 15. Scope Control and Decision Making

The user is building this project as a serious portfolio project and wants to understand the engineering decisions while using AI coding agents effectively.

Therefore:

- Explain important architectural or data-integrity decisions briefly and clearly.
- Do not hide significant trade-offs behind code changes.
- Prefer a working, tested, understandable solution over unnecessary sophistication.
- Do not introduce microservices, Kubernetes, event sourcing infrastructure, CQRS frameworks, caching systems, or new architectural patterns unless the task has a concrete need.
- Do not turn a focused task into a full rewrite.
- If you discover a separate issue, report it separately rather than silently expanding scope.
- When multiple solutions are viable, recommend one and explain the trade-off instead of presenting an unranked list.

## 16. Definition of Done

A task is complete only when all applicable conditions are satisfied:

- The requested behavior is implemented.
- Existing business rules and architecture are preserved.
- Relevant validation and authorization are in place.
- Tests cover the important success and failure scenarios.
- Relevant tests/builds were executed and their actual results are reported.
- Database changes include reviewed migrations where needed.
- No secrets or unrelated files were introduced.
- The final diff has been reviewed.
- Documentation is updated when necessary.
- Any untested behavior, risk, or remaining work is explicitly disclosed.

**Final reporting format:**

```text
Implemented
- ...

Important decisions
- ...

Validation
- Command: ...
- Result: ...

Not verified / remaining risks
- ...
```

## 17. Priority Rule

If a task request conflicts with a rule in this file, do not silently choose one.

Explain the conflict, identify the affected business or technical risk, and ask for clarification when the choice could affect security, data integrity, compatibility, or production data.

For all other cases, follow the user's explicit task while preserving the project's established conventions.