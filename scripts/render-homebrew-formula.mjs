#!/usr/bin/env node

import fs from "node:fs/promises";

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env ${name}`);
  }
  return value;
}

function optional(name) {
  return process.env[name] ?? "";
}

const version = required("VERSION");
const repoOwner = required("REPO_OWNER");
const repoName = required("REPO_NAME");
const tapFormulaPath = required("FORMULA_PATH");

const darwinArmUrl = optional("DARWIN_ARM64_URL");
const darwinArmSha = optional("DARWIN_ARM64_SHA256");
const darwinX64Url = optional("DARWIN_X64_URL");
const darwinX64Sha = optional("DARWIN_X64_SHA256");
const linuxX64Url = optional("LINUX_X64_URL");
const linuxX64Sha = optional("LINUX_X64_SHA256");
const linuxArmUrl = optional("LINUX_ARM64_URL");
const linuxArmSha = optional("LINUX_ARM64_SHA256");

const formula = `class OutlineCli < Formula
  desc "Agent-friendly CLI for Outline document CRUD"
  homepage "https://github.com/${repoOwner}/${repoName}"
  version "${version}"

  on_macos do
${darwinArmUrl ? `    on_arm do
      url "${darwinArmUrl}"
      sha256 "${darwinArmSha}"
    end
` : ""}${darwinX64Url ? `    on_intel do
      url "${darwinX64Url}"
      sha256 "${darwinX64Sha}"
    end
` : ""}  end

  on_linux do
${linuxArmUrl ? `    on_arm do
      url "${linuxArmUrl}"
      sha256 "${linuxArmSha}"
    end
` : ""}${linuxX64Url ? `    on_intel do
      url "${linuxX64Url}"
      sha256 "${linuxX64Sha}"
    end
` : ""}  end

  def install
    bin.install "outline"
  end

  test do
    output = shell_output("#{bin}/outline --help", 2)
    assert_match "Outline CLI", output
  end
end
`;

await fs.writeFile(tapFormulaPath, formula);

