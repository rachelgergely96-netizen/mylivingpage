const SSL_QUERY_PARAMETERS = [
  "sslmode",
  "sslcert",
  "sslkey",
  "sslrootcert",
  "sslpassword",
];

export function getVerifiedDatabaseClientConfig(databaseUrl) {
  const parsed = new URL(databaseUrl);
  const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const isLoopback = loopbackHosts.has(parsed.hostname.toLowerCase());

  // node-postgres lets SSL query parameters override the explicit `ssl`
  // object. Remove them so remote checks cannot silently disable certificate
  // verification. Local Supabase uses a loopback connection without TLS.
  SSL_QUERY_PARAMETERS.forEach((parameter) => parsed.searchParams.delete(parameter));

  return {
    connectionString: parsed.toString(),
    ssl: isLoopback ? false : { rejectUnauthorized: true },
  };
}
