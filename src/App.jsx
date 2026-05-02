import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function App() {
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [authData, setAuthData] = useState({ 
    username: '', 
    password: '',
    email: ''
  });

  // --- PROJE STATE'LERİ ---
  const [projeler, setProjeler] = useState([]); 
  const [seciliProjeId, setSeciliProjeId] = useState(null); 
  const [yeniProjeAdi, setYeniProjeAdi] = useState('');

  // --- E-POSTA / OTP STATE'LERİ ---
  const [showOTP, setShowOTP] = useState(false);
  const [otpStep, setOtpStep] = useState(1); 
  const [resetData, setResetData] = useState({ email: '', code: '', newP: '' });

  // --- ŞİFRE DEĞİŞTİRME STATE'LERİ ---
  const [passData, setPassData] = useState({ oldP: '', newP: '' });
  const [showPassChange, setShowPassChange] = useState(false);

  // --- FİRMA VE DİĞER STATE'LER ---
  const [seciliFirmaId, setSeciliFirmaId] = useState(null);
  const [yeniFirmaAdi, setYeniFirmaAdi] = useState('');
  const [yeniKalem, setYeniKalem] = useState({ cins: '', miktar: '', tutar: '' });
  const [odemeTutari, setOdemeTutari] = useState('');
  const [odemeAciklaması, setOdemeAciklaması] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const API_BASE_URL = 'https://noa-backend-ax4l.onrender.com/api';

  // --- VERİ KAYDETME ---
  const verileriKaydet = async (guncelProjeler) => {
    if (!user) return;
    try {
      await axios.post(`${API_BASE_URL}/update-data`, {
        username: user.username,
        projeler: guncelProjeler 
      });
    } catch (err) {
      console.error("Veritabanı hatası:", err);
    }
  };

  // --- AUTH İŞLEMLERİ ---
  const handleAuth = async (e) => {
    if(e) e.preventDefault();
    const url = isLogin ? `${API_BASE_URL}/login` : `${API_BASE_URL}/register`;
    try {
      const res = await axios.post(url, authData);
      if (isLogin) {
        const userData = res.data.user;
        setUser(userData);
        setProjeler(userData.projeler || []);
      } else {
        alert("Kayıt başarılı! Giriş yapabilirsiniz.");
        setIsLogin(true);
      }
    } catch (err) {
      alert(err.response?.data?.error || "Sunucu hatası!");
    }
  };

  // --- DÜZENLEME FONKSİYONLARI ---
  const projeAdiniDuzenle = (e, id, eskiAd) => {
    e.stopPropagation();
    const yeniAd = prompt("Proje adını düzenleyin:", eskiAd);
    if (yeniAd && yeniAd.trim() !== "" && yeniAd !== eskiAd) {
      const guncelListe = projeler.map(p => p.id === id ? { ...p, ad: yeniAd } : p);
      setProjeler(guncelListe);
      verileriKaydet(guncelListe);
    }
  };

  const firmaAdiniDuzenle = (id, eskiAd) => {
    const yeniAd = prompt("Firma adını düzenleyin:", eskiAd);
    if (yeniAd && yeniAd.trim() !== "" && yeniAd !== eskiAd) {
      const guncelFirmalar = firmalar.map(f => f.id === id ? { ...f, ad: yeniAd } : f);
      projeleriGuncelleVeKaydet(guncelFirmalar);
    }
  };

  // --- OTP / ŞİFRE FONKSİYONLARI ---
  const otpGonder = async () => {
    if (!authData.username || !resetData.email) return alert("Bilgileri eksiksiz girin!");
    try {
      const res = await axios.post(`${API_BASE_URL}/send-otp`, { username: authData.username, email: resetData.email });
      alert(res.data.message);
      setOtpStep(2);
    } catch (err) { alert(err.response?.data?.error || "Hata!"); }
  };

  const sifreOnayla = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/verify-otp-and-change`, { username: authData.username, otp: resetData.code, newPassword: resetData.newP });
      alert(res.data.message);
      setShowOTP(false);
      setResetData({ email: '', code: '', newP: '' });
    } catch (err) { alert(err.response?.data?.error || "Hata!"); }
  };

  const sifreDegistir = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/change-password`, { username: user.username, oldPassword: passData.oldP, newPassword: passData.newP });
      alert(res.data.message);
      setShowPassChange(false);
    } catch (err) { alert(err.response?.data?.error || "Hata!"); }
  };

  // --- HESAPLAMALAR ---
  const suankiProje = projeler.find(p => p.id === seciliProjeId);
  const firmalar = suankiProje ? suankiProje.firmalar : [];
  const seciliFirma = firmalar.find(f => f.id === seciliFirmaId);

  const fMaliyet = seciliFirma ? seciliFirma.kalemler.reduce((t, k) => t + Number(k.tutar || 0), 0) : 0;
  const fOdenen = seciliFirma ? seciliFirma.odemeGecmisi.reduce((t, o) => t + Number(o.miktar || 0), 0) : 0;
  const fBorc = fMaliyet - fOdenen;

  const genelMaliyet = firmalar.reduce((t, f) => t + (f.kalemler?.reduce((kt, k) => kt + Number(k.tutar || 0), 0) || 0), 0);
  const genelOdenen = firmalar.reduce((t, f) => t + (f.odemeGecmisi?.reduce((ot, o) => ot + Number(o.miktar || 0), 0) || 0), 0);
  const genelBorc = genelMaliyet - genelOdenen;

  // --- PROJE / FİRMA İŞLEMLERİ ---
  const projeEkle = () => {
    if (!yeniProjeAdi.trim()) return;
    const liste = [...projeler, { id: Date.now(), ad: yeniProjeAdi, firmalar: [] }];
    setProjeler(liste);
    verileriKaydet(liste);
    setYeniProjeAdi('');
  };

  const projeSil = (id) => {
    if (window.confirm("Silinsin mi?")) {
      const liste = projeler.filter(p => p.id !== id);
      setProjeler(liste);
      verileriKaydet(liste);
      setSeciliProjeId(null);
    }
  };

  const projeleriGuncelleVeKaydet = (yeniFirmalar) => {
    const guncelProjeler = projeler.map(p => p.id === seciliProjeId ? { ...p, firmalar: yeniFirmalar } : p);
    setProjeler(guncelProjeler);
    verileriKaydet(guncelProjeler);
  };

  const firmaEkle = () => {
    if (!yeniFirmaAdi.trim()) return;
    const yeniListe = [...firmalar, { id: Date.now(), ad: yeniFirmaAdi, kalemler: [], odemeGecmisi: [], not: '' }];
    projeleriGuncelleVeKaydet(yeniListe);
    setYeniFirmaAdi('');
  };

  const firmaSil = (id) => {
    if (window.confirm("Firma silinsin mi?")) {
      const liste = firmalar.filter(f => f.id !== id);
      projeleriGuncelleVeKaydet(liste);
      setSeciliFirmaId(null);
    }
  };

  const notGuncelle = (yeniNot) => {
    const liste = firmalar.map(f => f.id === seciliFirmaId ? { ...f, not: yeniNot } : f);
    projeleriGuncelleVeKaydet(liste);
  };

  const kalemEkle = () => {
    if (!yeniKalem.cins || !yeniKalem.tutar) return;
    const liste = firmalar.map(f => f.id === seciliFirmaId ? { ...f, kalemler: [...f.kalemler, { ...yeniKalem, id: Date.now(), tutar: Number(yeniKalem.tutar) }] } : f);
    projeleriGuncelleVeKaydet(liste);
    setYeniKalem({ cins: '', miktar: '', tutar: '' });
  };

  const odemeYap = () => {
    if (!odemeTutari || Number(odemeTutari) <= 0) return;
    const liste = firmalar.map(f => f.id === seciliFirmaId ? { ...f, odemeGecmisi: [...f.odemeGecmisi, { id: Date.now(), miktar: Number(odemeTutari), tarih: new Date().toLocaleDateString(), aciklama: odemeAciklaması }] } : f);
    projeleriGuncelleVeKaydet(liste);
    setOdemeTutari('');
    setOdemeAciklaması('');
  };

  const pdfUret = () => {
    try {
      const doc = new jsPDF();
      const tr = (m) => m ? m.toString().replace(/ğ/g, 'g').replace(/Ğ/g, 'G').replace(/ü/g, 'u').replace(/Ü/g, 'U').replace(/ş/g, 's').replace(/Ş/g, 'S').replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/ö/g, 'o').replace(/Ö/g, 'O').replace(/ç/g, 'c').replace(/Ç/g, 'C') : "";
      doc.text(`${tr(seciliFirma.ad)} RAPORU`, 14, 20);
      autoTable(doc, { head: [['Hizmet', 'Miktar', 'Tutar']], body: seciliFirma.kalemler.map(k => [tr(k.cins), tr(k.miktar), `${k.tutar} TL`]) });
      doc.save(`${tr(seciliFirma.ad)}.pdf`);
    } catch (e) { alert("PDF Hatası!"); }
  };

  // --- ARAYÜZ ---
  if (!user) {
    return (
      <div style={authContainer}>
        <div style={authBox}>
          <h2>{isLogin ? 'Giriş' : 'Üye Ol'}</h2>
          <form onSubmit={handleAuth}>
            <input style={inp} placeholder="Kullanıcı" value={authData.username} onChange={e => setAuthData({...authData, username: e.target.value})} />
            <input style={{...inp, marginTop: '10px'}} type="password" placeholder="Şifre" value={authData.password} onChange={e => setAuthData({...authData, password: e.target.value})} />
            <button style={{...btn, width: '100%', marginTop: '15px'}}>{isLogin ? 'Giriş' : 'Kayıt'}</button>
          </form>
          <p onClick={() => setIsLogin(!isLogin)} style={{cursor: 'pointer', fontSize: '13px'}}>{isLogin ? 'Üye Ol' : 'Giriş Yap'}</p>
          <p onClick={() => setShowOTP(!showOTP)} style={{color: 'orange', cursor: 'pointer', fontSize: '12px'}}>Şifremi Unuttum</p>
          {showOTP && (
            <div style={{marginTop: '10px', background: '#fff5eb', padding: '10px', borderRadius: '8px'}}>
              {otpStep === 1 ? (
                <><input style={inp} placeholder="E-posta" onChange={e => setResetData({...resetData, email: e.target.value})} /><button style={{...btn, background: 'orange', width: '100%'}} onClick={otpGonder}>Kod Gönder</button></>
              ) : (
                <><input style={inp} placeholder="Kod" onChange={e => setResetData({...resetData, code: e.target.value})} /><input style={inp} placeholder="Yeni Şifre" onChange={e => setResetData({...resetData, newP: e.target.value})} /><button style={{...btn, background: 'green', width: '100%'}} onClick={sifreOnayla}>Onayla</button></>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!seciliProjeId) {
    return (
      <div style={{padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <h2>Projelerim</h2>
        <div style={{width: '400px', background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)'}}>
          <div style={{display: 'flex', gap: '5px', marginBottom: '15px'}}>
            <input style={inp} value={yeniProjeAdi} onChange={e => setYeniProjeAdi(e.target.value)} placeholder="Proje Adı..." />
            <button style={btn} onClick={projeEkle}>Ekle</button>
          </div>
          {projeler.map(p => (
            <div key={p.id} onClick={() => setSeciliProjeId(p.id)} style={{padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer', display: 'flex', justifyContent: 'space-between'}}>
              <strong>{p.ad}</strong>
              <div><button onClick={(e) => projeAdiniDuzenle(e, p.id, p.ad)}>✏️</button> <button onClick={(e) => {e.stopPropagation(); projeSil(p.id)}}>🗑️</button></div>
            </div>
          ))}
        </div>
        <button onClick={() => window.location.reload()} style={{marginTop: '20px', color: 'red'}}>Çıkış Yap</button>
      </div>
    );
  }

  return (
    <div style={{padding: '20px', background: '#f0f2f5', minHeight: '100vh'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
        <button style={btn} onClick={() => {setSeciliProjeId(null); setSeciliFirmaId(null)}}>⬅ Geri</button>
        <h3>{suankiProje.ad.toUpperCase()}</h3>
        <span>{user.username}</span>
      </div>

      <div style={{display: 'flex', gap: '20px'}}>
        <div style={{width: '300px', background: 'white', padding: '15px', borderRadius: '10px'}}>
          <h4>Firmalar</h4>
          <input style={{...inp, marginBottom: '10px'}} placeholder="Ara..." onChange={e => setSearchTerm(e.target.value)} />
          <div style={{display: 'flex', gap: '5px', marginBottom: '10px'}}>
            <input style={inp} value={yeniFirmaAdi} onChange={e => setYeniFirmaAdi(e.target.value)} placeholder="Firma..." />
            <button style={btn} onClick={firmaEkle}>+</button>
          </div>
          {firmalar.filter(f => f.ad.toLowerCase().includes(searchTerm.toLowerCase())).map(f => (
            <div key={f.id} onClick={() => setSeciliFirmaId(f.id)} style={{padding: '10px', background: seciliFirmaId === f.id ? '#1a3353' : '#f9f9f9', color: seciliFirmaId === f.id ? 'white' : 'black', cursor: 'pointer', marginBottom: '5px', borderRadius: '5px', display: 'flex', justifyContent: 'space-between'}}>
              {f.ad}
              {/* FİRMA DÜZENLEME BUTONU */}
              <button onClick={(e) => { e.stopPropagation(); firmaAdiniDuzenle(f.id, f.ad); }} style={{background: 'none', border: 'none', cursor: 'pointer'}}>✏️</button>
            </div>
          ))}
        </div>

        <div style={{flex: 1, background: 'white', padding: '20px', borderRadius: '10px'}}>
          {seciliFirma ? (
            <>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <h3>{seciliFirma.ad} Detayları</h3>
                <button style={{...btn, background: 'orange'}} onClick={pdfUret}>PDF İndir</button>
              </div>
              <textarea style={{...inp, height: '60px', marginTop: '10px'}} value={seciliFirma.not} onChange={e => notGuncelle(e.target.value)} placeholder="Notlar..." />
              <div style={{marginTop: '15px', display: 'flex', gap: '10px'}}>
                <input style={inp} placeholder="Hizmet" onChange={e => setYeniKalem({...yeniKalem, cins: e.target.value})} />
                <input style={inp} placeholder="Tutar" type="number" onChange={e => setYeniKalem({...yeniKalem, tutar: e.target.value})} />
                <button style={btn} onClick={kalemEkle}>Ekle</button>
              </div>
              <div style={{marginTop: '15px', background: '#eafaf1', padding: '10px', borderRadius: '8px', display: 'flex', gap: '10px'}}>
                <input style={inp} placeholder="Ödeme Miktarı" onChange={e => setOdemeTutari(e.target.value)} />
                <button style={{...btn, background: 'green'}} onClick={odemeYap}>Ödeme Yap</button>
              </div>
              <table width="100%" style={{marginTop: '20px', textAlign: 'left'}}>
                <thead><tr><th>Hizmet</th><th>Tutar</th></tr></thead>
                <tbody>{seciliFirma.kalemler.map(k => (<tr key={k.id}><td>{k.cins}</td><td>{k.tutar.toLocaleString()} TL</td></tr>))}</tbody>
              </table>
            </>
          ) : "Bir firma seçin."}
        </div>
      </div>
    </div>
  );
}

const authContainer = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' };
const authBox = { background: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center', width: '320px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' };
const inp = { padding: '8px', borderRadius: '5px', border: '1px solid #ddd', width: '100%', boxSizing: 'border-box' };
const btn = { padding: '8px 12px', background: '#1a3353', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };