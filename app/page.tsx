'use client';

import { useState } from 'react';
import Image from "next/image";

export default function Home() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [result, setResult] = useState<string | null>(null); // State để lưu trữ kết quả

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Gửi yêu cầu đến API với email và mật khẩu
    try {
      const response = await fetch('/api/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'omit', // Đảm bảo không gửi cookie trong yêu cầu này
        body: JSON.stringify({ user: email, password: password }),
      });

      const data = await response.json();
      if (response.ok) {
        setResult(`Mã OTP của bạn là: ${data.otp}`);
      } else {
        setResult(`Lỗi: ${data.message}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setResult('Có lỗi xảy ra khi gửi yêu cầu');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h1>Nhập Email và Mật Khẩu</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ marginBottom: '10px', padding: '10px', width: '300px' }}
        />
        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ marginBottom: '20px', padding: '10px', width: '300px' }}
        />
        <button type="submit" style={{ padding: '10px 20px' }}>Gửi</button>
      </form>
      
      {/* Khung kết quả */}
      {result && (
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc', width: '300px', textAlign: 'center' }}>
          {result}
        </div>
      )}
    </div>
  );
}
