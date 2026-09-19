const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "BDAG");

  // 1. Mock stablecoin (leave out on mainnet - use a real issued token instead)
  const TestUSDC = await hre.ethers.getContractFactory("TestUSDC");
  const usdc = await TestUSDC.deploy();
  await usdc.waitForDeployment();
  console.log("TestUSDC deployed to:", await usdc.getAddress());

  // 2. Payment links / merchant checkout
  const PaymentLinks = await hre.ethers.getContractFactory("PaymentLinks");
  const links = await PaymentLinks.deploy();
  await links.waitForDeployment();
  console.log("PaymentLinks deployed to:", await links.getAddress());

  // 3. Tipping / creator payments
  const TipJar = await hre.ethers.getContractFactory("TipJar");
  const tipjar = await TipJar.deploy();
  await tipjar.waitForDeployment();
  console.log("TipJar deployed to:", await tipjar.getAddress());

  // Example: create a demo payment link worth 25 tUSDC
  const demoTx = await links.createLink(
    hre.ethers.parseUnits("25", 6),
    await usdc.getAddress(),
    "Invoice #1042 - coffee order"
  );
  await demoTx.wait();
  console.log("Demo link created (id 1): checkout/1 for 25 tUSDC");

  console.log("\nDone. Record these addresses for the dashboard config:");
  console.log({ paymentLinks: await links.getAddress(), tipJar: await tipjar.getAddress(), testUsdc: await usdc.getAddress() });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
