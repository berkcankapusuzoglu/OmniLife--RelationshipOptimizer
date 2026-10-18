import { X509Certificate } from "node:crypto";

const configurationError = "Invalid DATABASE_SSL_CA configuration";

export function databaseConnectionOptions(caPem) {
  const ssl = { rejectUnauthorized: true };

  if (caPem !== undefined) {
    if (typeof caPem !== "string" || !caPem.trim()) {
      throw new Error(configurationError);
    }

    const certificates = caPem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
    const remainder = caPem.replace(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g, "").trim();
    if (!certificates?.length || remainder) throw new Error(configurationError);

    try {
      certificates.forEach((certificate) => new X509Certificate(certificate));
    } catch {
      throw new Error(configurationError);
    }
    ssl.ca = caPem;
  }

  return { prepare: false, max: 1, connect_timeout: 10, ssl };
}
