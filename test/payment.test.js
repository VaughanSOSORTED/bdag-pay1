const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaymentLinks", () => {
  let links, usdc, merchant, buyer, other;

  const PRICE = ethers.parseEther("10"); // 10 BDAG

  beforeEach(async () => {
    [merchant, buyer, other] = await ethers.getSigners();

    const TestUSDC = await ethers.getContractFactory("TestUSDC");
    usdc = await TestUSDC.deploy();

    const PaymentLinks = await ethers.getContractFactory("PaymentLinks");
    links = await PaymentLinks.deploy();
  });

  it("creates a link with the right details", async () => {
    await expect(links.connect(merchant).createLink(PRICE, ethers.ZeroAddress, "Invoice #1"))
      .to.emit(links, "LinkCreated")
      .withArgs(1, merchant.address, PRICE, ethers.ZeroAddress, "Invoice #1");

    const link = await links.getLink(1);
    expect(link.payee).to.equal(merchant.address);
    expect(link.amount).to.equal(PRICE);
    expect(link.paid).to.equal(false);
  });

  it("pays a native BDAG link and emits a receipt", async () => {
    await links.connect(merchant).createLink(PRICE, ethers.ZeroAddress, "Invoice #1");

    const before = await ethers.provider.getBalance(merchant);

    await expect(links.connect(buyer).pay(1, { value: PRICE }))
      .to.emit(links, "Paid")
      .withArgs(1, buyer.address, merchant.address, PRICE, ethers.ZeroAddress, "Invoice #1", anyValue());

    const after = await ethers.provider.getBalance(merchant);
    expect(after - before).to.equal(PRICE);

    const link = await links.getLink(1);
    expect(link.paid).to.equal(true);
    expect(link.payer).to.equal(buyer.address);
  });

  it("rejects the wrong amount, unknown links and double payment", async () => {
    await links.connect(merchant).createLink(PRICE, ethers.ZeroAddress, "Invoice #1");

    await expect(links.connect(buyer).pay(1, { value: ethers.parseEther("9") }))
      .to.be.revertedWith("wrong amount");
    await expect(links.connect(buyer).pay(99, { value: PRICE }))
      .to.be.revertedWith("link does not exist");

    await links.connect(buyer).pay(1, { value: PRICE });
    await expect(links.connect(other).pay(1, { value: PRICE }))
      .to.be.revertedWith("link already paid");
  });

  it("pays a stablecoin link via ERC20 transfer", async () => {
    const tokenPrice = ethers.parseUnits("25", 6);
    await usdc.mint(buyer.address, tokenPrice);
    await usdc.connect(buyer).approve(links.getAddress(), tokenPrice);

    await links.connect(merchant).createLink(tokenPrice, await usdc.getAddress(), "Order #77");

    const before = await usdc.balanceOf(merchant.address);
    await links.connect(buyer).payToken(1);
    const after = await usdc.balanceOf(merchant.address);

    expect(after - before).to.equal(tokenPrice);
    expect((await links.getLink(1)).paid).to.equal(true);
  });

  it("forces native links to use pay() and ERC20 links to use payToken()", async () => {
    await links.connect(merchant).createLink(PRICE, ethers.ZeroAddress, "native");
    await expect(links.connect(buyer).payToken(1)).to.be.revertedWith("link is native BDAG, use pay");

    await links.connect(merchant).createLink(PRICE, await usdc.getAddress(), "token");
    await expect(links.connect(buyer).pay(2, { value: PRICE })).to.be.revertedWith("link is ERC20, use payToken");
  });
});

describe("TipJar", () => {
  it("forwards tips to the creator with a message", async () => {
    const [creator, fan] = await ethers.getSigners();
    const TipJar = await ethers.getContractFactory("TipJar");
    const jar = await TipJar.deploy();

    const before = await ethers.provider.getBalance(creator);
    await expect(jar.connect(fan).tip("great stream!", { value: ethers.parseEther("1") }))
      .to.emit(jar, "Tip")
      .withArgs(fan.address, creator.address, ethers.parseEther("1"), ethers.ZeroAddress, "great stream!");
    const after = await ethers.provider.getBalance(creator);
    expect(after - before).to.equal(ethers.parseEther("1"));

    await expect(jar.connect(fan).tip("no value", { value: 0 })).to.be.revertedWith("tip must be > 0");
  });
});

// Small helper so chai `withArgs` accepts the timestamp slot.
function anyValue() {
  return (matched) => true;
}
