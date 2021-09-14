#!/usr/bin/env node
// Requires pngcrush in PATH

const childProcess = require("child_process")

try {
  childProcess.execSync("pngcrush --help", {
    stdio: "ignore",
  })
} catch (e) {
  console.error(
    "You must have pngcrush in your path to use this tool. Get it here: https://pmt.sourceforge.io/pngcrush/"
  )
  process.exit(1)
}

try {
  childProcess.execSync("git status", {
    stdio: "pipe",
  })
} catch (e) {
  if (e.toString().includes("not a git repository")) {
    console.error("This directory is not a git repository.")
  }

  process.exit(1)
}

childProcess.execSync("git add .")

const files = childProcess
  .execSync("git diff --name-only --cached")
  .toString()
  .split("\n")
  .filter((file) => file.endsWith(".png"))

if (files.length === 0) {
  console.log("Nothing to crush")
  process.exit(0)
}

console.log(`Crushing ${files.length} files...`)

let pending = 0

function crush(file) {
  return new Promise((resolve) => {
    pending++
    const child = childProcess.spawn("pngcrush", [
      "-brute",
      "-noforce",
      "-q",
      "-ow",
      file,
      `${file}.crush`,
    ])

    child.stderr.on("data", (data) =>
      console.error(`[${file}]`, data.toString())
    )
    child.stdout.on("data", (data) => console.log(`[${file}]`, data.toString()))
    child.on("close", resolve)
  })
    .catch(() => {})
    .then(() => pending--)
}

const interval = setInterval(
  () => console.log(`Waiting on ${pending} files...`),
  2000
)

Promise.all(files.map(crush))
  .then(() => console.log("Done"))
  .catch((e) => console.error(e))
  .then(() => clearInterval(interval))
