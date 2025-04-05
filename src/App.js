import { useState } from "react";
import { ethers } from "ethers";
import RatPadABI from "./abi/RatPad.json";

const CONTRACT_ADDRESS = "0x85c1c28589f61113ba7bad763da50f3b48f4e331";

export default function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [form, setForm] = useState({
    name: "",
    symbol: "",
    supply: "",
    fee: "",
    pricePerToken: "",
    lpLock: "864000", // 10 days
  });
  const [status, setStatus] = useState("");

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const ratPad = new ethers.Contract(CONTRACT_ADDRESS, RatPadABI, signer);
    setAccount(address);
    setContract(ratPad);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const deployToken = async () => {
    const { name, symbol, supply, fee, pricePerToken, lpLock } = form;

    if (!contract) return alert("Connect wallet first");
    if (!name || !symbol || !supply || !fee || !pricePerToken || !lpLock)
      return alert("Please fill all fields");

    if (parseInt(fee) > 5) return alert("Fee must be ≤ 5%");
    if (parseInt(lpLock) < 864000)
      return alert("LP lock must be at least 10 days (864,000 seconds)");

    const minETH = 0.05;
    const ethValue = ethers.parseEther(minETH.toString());

    const provider = new ethers.BrowserProvider(window.ethereum);
    const balance = await provider.getBalance(account);
    const ethAmount = parseFloat(ethers.formatEther(balance));
    if (ethAmount < minETH) return alert("Need at least 0.05 ETH in wallet");

    const price = parseFloat(pricePerToken);
    if (isNaN(price) || price <= 0) return alert("Invalid token price");

    const minTokensForLP = Math.ceil(minETH / price);
    const totalSupply = parseInt(supply);
    if (totalSupply < minTokensForLP)
      return alert(`You must create at least ${minTokensForLP} tokens to provide 0.05 ETH worth of LP`);

    try {
      setStatus("🚀 Launching MemeCoin...");
      const tx = await contract.launchWithLiquidity(
        name,
        symbol,
        BigInt(totalSupply),
        BigInt(minTokensForLP),
        0,
        0,
        Math.floor(Date.now() / 1000) + 600,
        parseInt(lpLock),
        parseInt(fee),
        { value: ethValue }
      );
      await tx.wait();
      setStatus("✅ Token launched & LP locked!");
    } catch (err) {
      const msg = err?.info?.error?.message || err?.message || "Transaction failed.";
      console.error(err);
      setStatus("❌ " + msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#0044ff] text-white font-mono flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-extrabold mb-4">RICKYRAT LAUNCHPAD 🧀</h1>

      {!account ? (
        <button
          onClick={connectWallet}
          className="bg-yellow-400 text-black px-6 py-3 rounded-full font-bold hover:bg-yellow-300 shadow"
        >
          🦊 Connect MetaMask
        </button>
      ) : (
        <div className="bg-white text-black rounded-xl p-6 w-full max-w-lg space-y-4 shadow-xl">
          <div className="text-sm text-right text-gray-500 mb-2">
            {account.slice(0, 6)}...{account.slice(-4)}
          </div>

          <input name="name" onChange={handleChange} placeholder="Token Name" className="p-2 border rounded w-full" />
          <input name="symbol" onChange={handleChange} placeholder="Symbol (e.g. RICKY)" className="p-2 border rounded w-full" />
          <input name="supply" type="number" onChange={handleChange} placeholder="Total Supply" className="p-2 border rounded w-full" />
          <input name="fee" type="number" onChange={handleChange} placeholder="Fee % (max 5)" className="p-2 border rounded w-full" />
          <input name="pricePerToken" type="number" onChange={handleChange} placeholder="Token Price in ETH (e.g. 0.000001)" className="p-2 border rounded w-full" />

          <select name="lpLock" onChange={handleChange} className="p-2 border rounded w-full" defaultValue="864000">
            <option value="864000">Lock LP: 10 Days</option>
            <option value="1209600">Lock LP: 14 Days</option>
            <option value="2592000">Lock LP: 30 Days</option>
          </select>

          <button onClick={deployToken} className="bg-green-600 text-white font-bold px-6 py-2 rounded hover:bg-green-700 mt-2">
            🚀 Launch MemeCoin
          </button>

          {status && (
            <p className="text-center mt-2 text-sm text-gray-800 whitespace-pre-line">
              {status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
