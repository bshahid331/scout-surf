/**
 * API Specification Generator
 *
 * Generates comprehensive API documentation from route definitions.
 * Extracts authentication requirements, inputs, outputs, and required secrets.
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';
import { z } from 'zod';
import { getAllRouteConfigs } from '../src/routes/index.js';

// ═══════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════

interface RouteSpec {
  endpoint: string;
  method: string;
  path: string;
  description: string;
  tags: string[];
  public: boolean;
  admin: boolean;
  cron: boolean;
  cronExpression?: string;
  authentication: {
    required: boolean;
    types: string[];
  };
  rateLimit?: {
    requests: number;
    window: number;
  };
  secrets: string[];
  schemas: {
    request?: string;
    response?: string;
  };
  statusCodes: number[];
  examples?: {
    request?: any;
    response?: any;
  };
}

interface ApiSpec {
  info: {
    title: string;
    version: string;
    description: string;
    generatedAt: string;
  };
  authentication: {
    strategies: string[];
    default: string;
  };
  standardStatusCodes: Record<string, number>;
  routes: RouteSpec[];
}

// ═══════════════════════════════════════════════════════════════
// PARSERS
// ═══════════════════════════════════════════════════════════════

/**
 * Extract JSDoc comments from route files
 */
function extractJSDocInfo(content: string): { cron?: boolean; secrets?: string[] } {
  const jsdocMatch = content.match(/\/\*\*[\s\S]*?\*\//);
  if (!jsdocMatch) return {};

  const jsdoc = jsdocMatch[0];

  // Extract @cron (boolean flag)
  const cronMatch = jsdoc.match(/@cron\s+(true|false)/);
  const isCronRoute = cronMatch?.[1] === 'true';

  // Extract @secrets
  const secretsMatch = jsdoc.match(/@secrets\s+([^\n\r]+)/);
  const secretsStr = secretsMatch?.[1] || 'none';
  const secrets = secretsStr === 'none' ? [] : secretsStr.split(',').map((s) => s.trim());

  return {
    cron: isCronRoute,
    secrets,
  };
}

/**
 * Extract schema information from route files
 */
function extractSchemas(content: string): { request?: string; response?: string } {
  const schemas: { request?: string; response?: string } = {};

  // Look for request schema exports
  const requestSchemaMatch = content.match(
    /export const \w*(?:Request|Input)Schema = z\.object\({[\s\S]*?}\)/,
  );
  if (requestSchemaMatch) {
    schemas.request = requestSchemaMatch[0];
  }

  // Look for response schema exports
  const responseSchemaMatch = content.match(
    /export const \w*(?:Response|Output)Schema = z\.object\({[\s\S]*?}\)/,
  );
  if (responseSchemaMatch) {
    schemas.response = responseSchemaMatch[0];
  }

  return schemas;
}

/**
 * Extract rate limit configuration
 */
function extractRateLimit(content: string): { requests: number; window: number } | undefined {
  const rateLimitMatch = content.match(/rateLimit:\s*\{\s*requests:\s*(\d+),\s*window:\s*(\d+)/);
  if (rateLimitMatch) {
    return {
      requests: parseInt(rateLimitMatch[1]),
      window: parseInt(rateLimitMatch[2]),
    };
  }
  return undefined;
}

/**
 * Extract status codes used in route
 */
function extractStatusCodes(content: string): number[] {
  const statusCodes = new Set<number>();

  // Look for STANDARD_STATUS_CODES usage
  const standardCodeMatches = content.matchAll(/STANDARD_STATUS_CODES\.(\w+)/g);
  for (const match of standardCodeMatches) {
    const codeName = match[1];
    switch (codeName) {
      case 'SUCCESS':
        statusCodes.add(200);
        break;
      case 'BAD_REQUEST':
        statusCodes.add(400);
        break;
      case 'UNAUTHORIZED':
        statusCodes.add(401);
        break;
      case 'NOT_FOUND':
        statusCodes.add(404);
        break;
      case 'INTERNAL_ERROR':
        statusCodes.add(500);
        break;
    }
  }

  // Look for ApiErrors usage
  if (content.includes('ApiErrors.badRequest')) statusCodes.add(400);
  if (content.includes('ApiErrors.unauthorized')) statusCodes.add(401);
  if (content.includes('ApiErrors.notFound')) statusCodes.add(404);
  if (content.includes('ApiErrors.internal')) statusCodes.add(500);

  // Always include 200 for successful responses
  statusCodes.add(200);

  return Array.from(statusCodes).sort();
}

// ═══════════════════════════════════════════════════════════════
// MAIN GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate API specification from route configurations
 */
async function generateApiSpec(): Promise<ApiSpec> {
  const routeConfigs = getAllRouteConfigs();
  const routes: RouteSpec[] = [];

  for (const config of routeConfigs) {
    try {
      // Extract schemas and status codes from the route file if it exists
      const fileName = config.name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
      const routeFilePath = `src/routes/${fileName}.ts`;
      let schemas: { request?: string; response?: string } = {};
      let statusCodes = [200]; // Default status codes
      let isCronRoute = false;

      let jsdocInfo: Partial<RouteSpec> = {};

      if (existsSync(routeFilePath)) {
        const content = readFileSync(routeFilePath, 'utf8');
        schemas = extractSchemas(content);
        statusCodes = extractStatusCodes(content);

        // Extract JSDoc information including @cron and @secrets
        jsdocInfo = extractJSDocInfo(content);
        isCronRoute = jsdocInfo.cron || false;
      }

      // Determine authentication requirements
      const requiresAuth = config.requiresAuth ?? true; // Default to requiring auth
      const isAdminRoute = config.tags?.includes('admin') || isCronRoute; // Cron routes are admin routes

      routes.push({
        endpoint: `${config.method} ${config.path}`,
        method: config.method,
        path: config.path,
        description: config.description,
        tags: config.tags || [],
        public: !requiresAuth,
        admin: isAdminRoute,
        cron: isCronRoute,
        cronExpression: config.cronExpression,
        authentication: {
          required: requiresAuth,
          types: requiresAuth
            ? isAdminRoute
              ? ['jwt', 'tarobase', 'api-key']
              : ['jwt', 'tarobase']
            : [],
        },
        rateLimit: config.rateLimit,
        secrets: jsdocInfo.secrets || [],
        schemas,
        statusCodes,
      });
    } catch (error) {
      console.warn(`Failed to process route ${config.name}:`, error);
    }
  }

  return {
    info: {
      title: 'Poof PartyServer API',
      version: '1.0.0',
      description: 'Type-safe HTTP API for real-time applications',
      generatedAt: new Date().toISOString(),
    },
    authentication: {
      strategies: ['public', 'jwt', 'tarobase'],
      default: 'public',
    },
    standardStatusCodes: {
      SUCCESS: 200,
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      NOT_FOUND: 404,
      INTERNAL_ERROR: 500,
    },
    routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
  };
}

/**
 * Generate markdown documentation from API spec
 */
function generateMarkdownDocs(spec: ApiSpec): string {
  let markdown = `# ${spec.info.title}\n\n`;
  markdown += `${spec.info.description}\n\n`;
  markdown += `**Version:** ${spec.info.version}  \n`;
  markdown += `**Generated:** ${spec.info.generatedAt}\n\n`;

  // Authentication section
  markdown += `## 🔐 Authentication\n\n`;
  markdown += `**Available Strategies:** ${spec.authentication.strategies.join(', ')}  \n`;
  markdown += `**Default:** ${spec.authentication.default}\n\n`;

  // Status codes section
  markdown += `## 📊 Standard Status Codes\n\n`;
  markdown += `All endpoints use these standardized status codes:\n\n`;
  for (const [name, code] of Object.entries(spec.standardStatusCodes)) {
    markdown += `- **${code}** (${name}): `;
    switch (name) {
      case 'SUCCESS':
        markdown += 'All successful responses\n';
        break;
      case 'BAD_REQUEST':
        markdown += 'Client errors (validation, invalid input)\n';
        break;
      case 'UNAUTHORIZED':
        markdown += 'Authentication/authorization errors\n';
        break;
      case 'NOT_FOUND':
        markdown += 'Resource not found\n';
        break;
      case 'INTERNAL_ERROR':
        markdown += 'Server errors (uncaught exceptions)\n';
        break;
    }
  }
  markdown += '\n';

  // HTTP Endpoints section
  markdown += `## 🌐 HTTP Endpoints\n\n`;

  for (const route of spec.routes) {
    markdown += `### ${route.endpoint}\n\n`;
    markdown += `${route.description}\n\n`;

    // Metadata table
    markdown += `| Property | Value |\n`;
    markdown += `|----------|-------|\n`;
    markdown += `| **Method** | \`${route.method}\` |\n`;
    markdown += `| **Path** | \`${route.path}\` |\n`;
    markdown += `| **Public** | ${route.public ? '✅ Yes' : '❌ No'} |\n`;
    markdown += `| **Authentication** | ${route.authentication.required ? route.authentication.types.join(', ') : 'None'} |\n`;
    markdown += `| **Tags** | ${route.tags.join(', ')} |\n`;
    markdown += `| **Secrets** | ${route.secrets.length > 0 ? route.secrets.join(', ') : 'None'} |\n`;
    markdown += `| **Status Codes** | ${route.statusCodes.join(', ')} |\n`;

    if (route.cronExpression) {
      markdown += `| **Cron Expression** | \`${route.cronExpression}\` |\n`;
    }

    if (route.rateLimit) {
      markdown += `| **Rate Limit** | ${route.rateLimit.requests} requests per ${route.rateLimit.window}s |\n`;
    }

    markdown += '\n';

    // Schemas
    if (route.schemas.request) {
      markdown += `**Request Schema:**\n\`\`\`typescript\n${route.schemas.request}\n\`\`\`\n\n`;
    }

    if (route.schemas.response) {
      markdown += `**Response Schema:**\n\`\`\`typescript\n${route.schemas.response}\n\`\`\`\n\n`;
    }

    markdown += `---\n\n`;
  }

  return markdown;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔍 Analyzing route definitions...');
    const spec = await generateApiSpec();

    console.log(`📊 Found ${spec.routes.length} HTTP endpoints`);

    // Write JSON spec
    writeFileSync('generated/api-spec.json', JSON.stringify(spec, null, 2));
    console.log('✅ Generated API spec: generated/api-spec.json');

    // Write markdown documentation
    const markdown = generateMarkdownDocs(spec);
    writeFileSync('generated/API_DOCUMENTATION.md', markdown);
    console.log('✅ Generated documentation: generated/API_DOCUMENTATION.md');

    // Summary
    console.log('\n📋 Summary:');
    console.log(`- ${spec.routes.length} HTTP endpoints`);
    console.log(`- ${spec.routes.filter((r) => r.public).length} public endpoints`);
    console.log(
      `- ${spec.routes.filter((r) => r.authentication.required).length} protected endpoints`,
    );
  } catch (error) {
    console.error('❌ Failed to generate API spec:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
