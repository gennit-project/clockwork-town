declare module 'markdown-it' {
  export default class MarkdownIt {
    constructor(options?: Record<string, unknown>)
    render(markdown: string): string
    enable(rules: string | string[]): this
    disable(rules: string | string[]): this
    set(options: Record<string, unknown>): this
    renderer: {
      rules: Record<string, (...args: unknown[]) => string>
    }
  }
}

declare module 'crypto-js' {
  const CryptoJS: any
  export default CryptoJS
}

declare module 'kuzu' {
  export default class kuzu {
    static Database: new (path: string) => unknown
    static Connection: new (database: unknown) => {
      query: (statement: string) => Promise<{
        getAll: () => Promise<unknown[]>
      }>
    }
  }
}

interface GoogleOAuthTokenResponse {
  access_token: string
  error?: string
}

interface GoogleTokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void
}

interface Window {
  google: {
    accounts: {
      oauth2: {
        initTokenClient: (config: {
          client_id: string
          scope: string
          callback: (response: GoogleOAuthTokenResponse) => void
        }) => GoogleTokenClient
      }
    }
  }
}
