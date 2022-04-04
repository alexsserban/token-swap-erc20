const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenSwap", function () {
    let tx;
    let addrs;
    let Token;
    let token1, token2;

    const token1Total = ethers.utils.parseEther("100");
    const token2Total = ethers.utils.parseEther("100");

    const token1ToSwap = ethers.utils.parseEther("10");
    const token2ToSwap = ethers.utils.parseEther("20");

    before(async () => {
        Token = await ethers.getContractFactory("MyToken");
        TokenSwap = await ethers.getContractFactory("TokenSwap");
    });

    beforeEach(async () => {
        addrs = await ethers.getSigners();

        token1 = await Token.connect(addrs[1]).deploy();
        token2 = await Token.connect(addrs[2]).deploy();

        await token1.deployed();
        await token2.deployed();

        tokenSwap = await TokenSwap.connect(addrs[0]).deploy(
            token1.address,
            addrs[1].address,
            token1ToSwap,
            token2.address,
            addrs[2].address,
            token2ToSwap
        );

        await tokenSwap.deployed();
    });

    it("should swap", async function () {
        // Check balance before swap
        let balance = await token1.balanceOf(addrs[1].address);
        expect(balance).to.equal(token1Total);

        balance = await token2.balanceOf(addrs[2].address);
        expect(balance).to.equal(token2Total);

        // Approve swap
        await token1.connect(addrs[1]).approve(tokenSwap.address, token1ToSwap);
        await token2.connect(addrs[2]).approve(tokenSwap.address, token2ToSwap);

        // Swap
        await tokenSwap.connect(addrs[1]).swap();

        // user1 - Check Token1 balance
        balance = await token1.balanceOf(addrs[1].address);
        expect(balance).to.equal(token1Total.sub(token1ToSwap));

        // user1 - Check Token2 balance
        balance = await token2.balanceOf(addrs[1].address);
        expect(balance).to.equal(token2ToSwap);

        // user2 - Check Token2 balance
        balance = await token2.balanceOf(addrs[2].address);
        expect(balance).to.equal(token2Total.sub(token2ToSwap));

        // user2 - Check Token1 balance
        balance = await token1.balanceOf(addrs[2].address);
        expect(balance).to.equal(token1ToSwap);
    });

    it("should reject, if swap not called by one of the users", async function () {
        tx = tokenSwap.swap();
        await expect(tx).to.be.revertedWith("Not authorized");
    });

    it("should reject, if first user didn't allowed enough", async function () {
        await token1.connect(addrs[1]).approve(tokenSwap.address, token1ToSwap.div(2));
        await token2.connect(addrs[2]).approve(tokenSwap.address, token2ToSwap);

        tx = tokenSwap.connect(addrs[1]).swap();
        await expect(tx).to.be.revertedWith("Token 1 allowance too low");
    });

    it("should reject, if first user didn't allowed enough", async function () {
        await token1.connect(addrs[1]).approve(tokenSwap.address, token1ToSwap);
        await token2.connect(addrs[2]).approve(tokenSwap.address, token2ToSwap.div(2));

        tx = tokenSwap.connect(addrs[1]).swap();
        await expect(tx).to.be.revertedWith("Token 2 allowance too low");
    });
});
