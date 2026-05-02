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

  // --- E-POSTA / OTP ŞİFRE SIFIRLAMA STATE'LERİ ---
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

  // --- PROJE İSMİ DÜZENLEME (YENİ EKLEDİĞİMİZ KISIM) ---
  const projeAdiniDuzenle = (e, id, eskiAd) => {
    e.stopPropagation(); // Kartın tıklanma olayını (proje içine girme) engelle
    const yeniAd = prompt("Proje adını düzenleyin:", eskiAd);
    
    if (yeniAd && yeniAd.trim() !== "" && yeniAd !== eskiAd) {
      const guncelListe = projeler.map(p => 
        p.id === id ? { ...p, ad: yeniAd } : p
      );
      setProjeler(guncelListe);
      verileriKaydet(guncelListe);
    }
  };

  // --- OTP İŞLEMLERİ ---
  const otpGonder = async () => {
    if (!authData.username || !resetData.email) {
      return alert("Lütfen yukarıya Kullanıcı Adınızı, aşağıya kayıtlı E-posta adresinizi girin!");
    }
    try {
      const res = await axios.post(`${API_BASE_URL}/send-otp`, { 
        username: authData.username, 
        email: resetData.email 
      });
      alert(res.data.message);
      setOtpStep(2);
    } catch (err) {
      alert(err.response?.data?.error || "Kod gönderilemedi!");
    }
  };

  const sifreOnayla = async () => {
    if (!resetData.code || !resetData.newP) return alert("Kod ve yeni şifre gerekli!");
    try {
      const res = await axios.post(`${API_BASE_URL}/verify-otp-and-change`, { 
        username: authData.username, 
        otp: resetData.code, 
        newPassword: resetData.newP 
      });
      alert(res.data.message);
      setShowOTP(false);
      setOtpStep(1);
      setResetData({ email: '', code: '', newP: '' });
    } catch (err) {
      alert(err.response?.data?.error || "Şifre güncellenemedi!");
    }
  };

  const sifreDegistir = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/change-password`, {
        username: user.username,
        oldPassword: passData.oldP,
        newPassword: passData.newP
      });
      alert(res.data.message);
      setShowPassChange(false);
      setPassData({ oldP: '', newP: '' });
    } catch (err) {
      alert(err.response?.data?.error || "Hata oluştu");
    }
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

  // --- PROJE İŞLEMLERİ ---
  const projeEkle = () => {
    if (!yeniProjeAdi.trim()) return;
    const yeni = { id: Date.now(), ad: yeniProjeAdi, firmalar: [] };
    const liste = [...projeler, yeni];
    setProjeler(liste);
    verileriKaydet(liste);
    setYeniProjeAdi('');
  };

  const projeSil = (id) => {
    if (window.confirm("Bu projeyi ve içindeki TÜM verileri silmek istediğinize emin misiniz?")) {
      const liste = projeler.filter(p => p.id !== id);
      setProjeler(liste);
      verileriKaydet(liste);
      setSeciliProjeId(null);
    }
  };

  const projeleriGuncelleVeKaydet = (yeniFirmalar) => {
    const guncelProjeler = projeler.map(p => 
      p.id === seciliProjeId ? { ...p, firmalar: yeniFirmalar } : p
    );
    setProjeler(guncelProjeler);
    verileriKaydet(guncelProjeler);
  };

  const firmaEkle = () => {
    if (!yeniFirmaAdi.trim()) return;
    const yeni = { id: Date.now(), ad: yeniFirmaAdi, kalemler: [], odemeGecmisi: [], not: '' };
    const yeniListe = [...firmalar, yeni];
    projeleriGuncelleVeKaydet(yeniListe);
    setYeniFirmaAdi('');
  };

  const firmaSil = (id) => {
    if (window.confirm("Bu firmayı silmek istediğinize emin misiniz?")) {
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
    const liste = firmalar.map(f => f.id === seciliFirmaId 
      ? { ...f, kalemler: [...f.kalemler, { ...yeniKalem, id: Date.now(), tutar: Number(yeniKalem.tutar) }] } : f);
    projeleriGuncelleVeKaydet(liste);
    setYeniKalem({ cins: '', miktar: '', tutar: '' });
  };

  const odemeYap = () => {
    if (!odemeTutari || Number(odemeTutari) <= 0) return;
    const liste = firmalar.map(f => f.id === seciliFirmaId ? { 
      ...f, odemeGecmisi: [...f.odemeGecmisi, { 
        id: Date.now(), 
        miktar: Number(odemeTutari), 
        tarih: new Date().toLocaleDateString(),
        aciklama: odemeAciklaması
      }] 
    } : f);
    projeleriGuncelleVeKaydet(liste);
    setOdemeTutari('');
    setOdemeAciklaması('');
  };

  const pdfUret = () => {
    try {
      if (!seciliFirma) return;
      const doc = new jsPDF();
      const trTemizle = (m) => m ? m.toString().replace(/ğ/g, 'g').replace(/Ğ/g, 'G').replace(/ü/g, 'u').replace(/Ü/g, 'U').replace(/ş/g, 's').replace(/Ş/g, 'S').replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/ö/g, 'o').replace(/Ö/g, 'O').replace(/ç/g, 'c').replace(/Ç/g, 'C') : "";
      doc.setFontSize(18);
      doc.text(`${trTemizle(seciliFirma.ad)} - RAPOR`, 14, 22);
      doc.setFontSize(11);
      doc.text(`Proje: ${trTemizle(suankiProje.ad)}`, 14, 30);
      doc.text(`Tarih: ${new Date().toLocaleDateString()} | Net Borc: ${fBorc.toLocaleString()} TL`, 14, 38);
      autoTable(doc, {
        startY: 45,
        head: [['Hizmet/Malzeme', 'Miktar', 'Tutar']],
        body: seciliFirma.kalemler.map(k => [trTemizle(k.cins), trTemizle(k.miktar), `${k.tutar.toLocaleString()} TL`]),
        theme: 'grid',
        headStyles: { fillColor: [26, 51, 83] }
      });
      const finalY = doc.lastAutoTable.finalY;
      doc.text("Odeme Gecmisi", 14, finalY + 10);
      autoTable(doc, {
        startY: finalY + 15,
        head: [['Tarih', 'Aciklama', 'Miktar']],
        body: seciliFirma.odemeGecmisi.map(o => [o.tarih, trTemizle(o.aciklama) || '-', `${o.miktar.toLocaleString()} TL`]),
        theme: 'striped',
        headStyles: { fillColor: [46, 204, 113] }
      });
      doc.save(`${trTemizle(seciliFirma.ad)}_rapor.pdf`);
    } catch (e) { alert("PDF Hatası!"); }
  };

  // --- GİRİŞ EKRANI ---
  if (!user) {
    return (
      <div style={authContainer}>
        <div style={authBox}>
          <h2 style={{color: '#1a3353', marginBottom: '20px'}}>{isLogin ? 'Giriş Yap' : 'Üye Ol'}</h2>
          <form onSubmit={handleAuth}>
            <input style={inp} placeholder="Kullanıcı Adı" value={authData.username} onChange={e => setAuthData({...authData, username: e.target.value})} />
            <input style={{...inp, marginTop: '10px'}} type="password" placeholder="Şifre" value={authData.password} onChange={e => setAuthData({...authData, password: e.target.value})} />
            <button type="submit" style={{...btn, width: '100%', marginTop: '15px'}}>{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</button>
          </form>
          <p style={{cursor: 'pointer', fontSize: '14px', marginTop: '15px'}} onClick={() => setIsLogin(!isLogin)}>{isLogin ? 'Hesabınız yok mu? Üye olun' : 'Zaten üyeyim? Giriş yapın'}</p>
          <p onClick={() => setShowOTP(!showOTP)} style={{cursor: 'pointer', fontSize: '13px', color: '#e67e22', marginTop: '10px', textDecoration: 'underline'}}>Şifremi Unuttum / Değiştir</p>
          {showOTP && (
            <div style={{marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '10px', backgroundColor: '#fff9f4'}}>
              {otpStep === 1 ? (
                <div style={{textAlign: 'left'}}>
                  <h4 style={{margin: '0 0 10px 0', fontSize: '14px'}}>E-posta ile Kod Gönder</h4>
                  <input style={inp} placeholder="Kayıtlı E-posta Adresiniz" value={resetData.email} onChange={e => setResetData({...resetData, email: e.target.value})} />
                  <button type="button" style={{...btn, width: '100%', marginTop: '10px', background: '#e67e22'}} onClick={() => otpGonder()}>Kod Gönder</button>
                </div>
              ) : (
                <div style={{textAlign: 'left'}}>
                  <h4 style={{margin: '0 0 10px 0', fontSize: '14px'}}>Kodu Doğrula</h4>
                  <input style={inp} placeholder="6 Haneli Kod" value={resetData.code} onChange={e => setResetData({...resetData, code: e.target.value})} />
                  <input style={{...inp, marginTop: '8px'}} type="password" placeholder="Yeni Şifre" value={resetData.newP} onChange={e => setResetData({...resetData, newP: e.target.value})} />
                  <button type="button" style={{...btn, width: '100%', marginTop: '10px', background: '#2ecc71'}} onClick={() => sifreOnayla()}>Şifreyi Güncelle</button>
                </div>
              )}
              <button type="button" onClick={() => {setShowOTP(false); setOtpStep(1);}} style={{background: 'none', border: 'none', fontSize: '12px', marginTop: '10px', cursor: 'pointer', color: '#666', width: '100%'}}>İptal</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- PROJE SEÇİM EKRANI ---
  if (!seciliProjeId) {
    return (
      <div style={{ padding: '40px', backgroundColor: '#f0f2f5', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{color: '#1a3353', marginBottom: '30px'}}>Projelerim</h2>
        <div style={{ width: '450px', background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <div style={{display: 'flex', gap: '10px', marginBottom: '25px'}}>
            <input value={yeniProjeAdi} onChange={e => setYeniProjeAdi(e.target.value)} placeholder="Yeni Proje Adı..." style={inp} />
            <button onClick={projeEkle} style={btn}>Ekle</button>
          </div>
          {projeler.map(p => (
            <div key={p.id} onClick={() => setSeciliProjeId(p.id)} style={{ padding: '15px', background: '#f8f9fa', borderRadius: '10px', marginBottom: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #eee' }}>
              <strong>{p.ad.toUpperCase()}</strong>
              <div style={{display: 'flex', gap: '10px'}}>
                {/* DÜZENLEME BUTONU */}
                <button 
                  onClick={(e) => projeAdiniDuzenle(e, p.id, p.ad)} 
                  style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px'}}
                  title="Düzenle"
                >
                  ✏️
                </button>
                {/* SİLME BUTONU */}
                <button 
                  onClick={(e) => { e.stopPropagation(); projeSil(p.id); }} 
                  style={{background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '18px'}}
                  title="Sil"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
          {projeler.length === 0 && <p style={{textAlign: 'center', color: '#999'}}>Henüz proje eklenmemiş.</p>}
        </div>
        <div onClick={() => window.location.reload()} style={{marginTop: '25px', fontSize: '14px', color: '#e74c3c', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline'}}>🔒 Güvenli Çıkış Yap</div>
        <div style={{ marginTop: '15px' }}><span onClick={() => setShowPassChange(!showPassChange)} style={{ cursor: 'pointer', fontSize: '13px', color: '#3498db', textDecoration: 'underline' }}>⚙️ Şifre Değiştir (İçeriden)</span></div>
        {showPassChange && (
            <div style={{ marginTop: '15px', background: 'white', padding: '15px', borderRadius: '10px', border: '1px solid #ddd', width: '300px' }}>
                <input type="password" placeholder="Mevcut Şifre" style={{...inp, marginBottom: '8px'}} onChange={e => setPassData({...passData, oldP: e.target.value})} />
                <input type="password" placeholder="Yeni Şifre" style={{...inp, marginBottom: '12px'}} onChange={e => setPassData({...passData, newP: e.target.value})} />
                <button onClick={sifreDegistir} style={{...btn, width: '100%', background: '#2980b9'}}>Şifreyi Güncelle</button>
            </div>
        )}
      </div>
    );
  }

  // --- ANA DASHBOARD ---
  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', padding: '20px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <button onClick={() => { setSeciliProjeId(null); setSeciliFirmaId(null); }} style={{...btn, background: '#34495e', padding: '5px 15px'}}>⬅ Projeler</button>
          <h2 style={{color: '#1a3353', margin: 0}}>{suankiProje.ad.toUpperCase()}</h2>
        </div>
        <div style={{fontSize: '14px'}}><b>{user.username}</b> | <span style={{cursor: 'pointer', color: 'red'}} onClick={() => window.location.reload()}>Çıkış</span></div>
      </div>
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
        <div style={kart('#3498db')}>Genel Maliyet: {genelMaliyet.toLocaleString()} TL</div>
        <div style={kart('#2ecc71')}>Toplam Ödenen: {genelOdenen.toLocaleString()} TL</div>
        <div style={{ ...kart('#e74c3c'), color: '#e74c3c' }}>Net Borç: {genelBorc.toLocaleString()} TL</div>
      </div>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ width: '320px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', alignSelf: 'flex-start' }}>
          <h4>Firmalar</h4>
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="🔍 Firma Ara..." style={{...inp, marginBottom: '10px'}} />
          <div style={{display: 'flex', gap: '5px', marginBottom: '15px'}}>
            <input value={yeniFirmaAdi} onChange={e => setYeniFirmaAdi(e.target.value)} placeholder="Firma Ekle..." style={inp} />
            <button onClick={firmaEkle} style={btn}>+</button>
          </div>
          <div style={{maxHeight: '450px', overflowY: 'auto'}}>
            {firmalar.filter(f => f.ad.toLowerCase().includes(searchTerm.toLowerCase())).map(f => (
              <div key={f.id} onClick={() => setSeciliFirmaId(f.id)} style={{ padding: '12px', cursor: 'pointer', background: seciliFirmaId === f.id ? '#1a3353' : '#f8f9fa', color: seciliFirmaId === f.id ? 'white' : 'black', margin: '8px 0', borderRadius: '8px', border: '1px solid #ddd' }}>
                <strong>{f.ad}</strong>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          {seciliFirma ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <h3 style={{ margin: 0 }}>{seciliFirma.ad} Analizi</h3>
                  <button onClick={pdfUret} style={{ ...btn, background: '#e67e22', padding: '5px 12px', fontSize: '12px' }}>📄 PDF Raporu İndir</button>
                  <button onClick={() => firmaSil(seciliFirma.id)} style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}>⚠️ Bu Firmayı Tamamen Sil</button>
                </div>
                <div style={{display: 'flex', gap: '10px'}}>
                   <div style={kucukOzet('#3498db')}>Maliyet: {fMaliyet.toLocaleString()} TL</div>
                   <div style={kucukOzet('#2ecc71')}>Ödenen: {fOdenen.toLocaleString()} TL</div>
                   <div style={kucukOzet('#e74c3c')}>Borç: {fBorc.toLocaleString()} TL</div>
                </div>
              </div>
              <div style={{marginBottom: '20px'}}>
                <label style={{fontSize: '13px', color: '#666', fontWeight: 'bold'}}>Firma Notları / Açıklama:</label>
                <textarea value={seciliFirma.not} onChange={(e) => notGuncelle(e.target.value)} style={{...inp, height: '80px', marginTop: '5px'}} placeholder="Firmaya dair özel notlar..." />
              </div>
              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px' }}>
                  <input placeholder="Malzeme/Hizmet" value={yeniKalem.cins} onChange={e => setYeniKalem({ ...yeniKalem, cins: e.target.value })} style={inp} />
                  <input placeholder="Miktar" value={yeniKalem.miktar} onChange={e => setYeniKalem({ ...yeniKalem, miktar: e.target.value })} style={inp} />
                  <input placeholder="Tutar" type="number" value={yeniKalem.tutar} onChange={e => setYeniKalem({ ...yeniKalem, tutar: e.target.value })} style={inp} />
                  <button onClick={kalemEkle} style={btn}>Ekle</button>
                </div>
              </div>
              <div style={{display: 'flex', gap: '10px', marginBottom: '20px', padding: '15px', backgroundColor: '#eafaf1', borderRadius: '10px', alignItems: 'center'}}>
                  <strong style={{fontSize: '14px', color: '#27ae60'}}>Nakit/Çek Ödeme:</strong>
                  <input placeholder="Miktar..." type="number" value={odemeTutari} onChange={e => setOdemeTutari(e.target.value)} style={{...inp, flex: 1}} />
                  <input placeholder="Açıklama..." value={odemeAciklaması} onChange={e => setOdemeAciklaması(e.target.value)} style={{...inp, flex: 2}} />
                  <button onClick={odemeYap} style={{ ...btn, background: '#2ecc71', width: '180px' }}>Öde</button>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '25px'}}>
                <div>
                  <h5 style={{margin: '0 0 10px 0'}}>Harcama Kalemleri</h5>
                  <table width="100%" style={{fontSize: '14px', borderCollapse: 'collapse'}}>
                    <thead><tr style={{textAlign: 'left', borderBottom: '2px solid #eee'}}><th>Hizmet</th><th>Miktar</th><th>Tutar</th></tr></thead>
                    <tbody>{seciliFirma.kalemler.map(k => (<tr key={k.id} style={{borderBottom: '1px solid #f9f9f9'}}><td style={{padding: '10px 0'}}>{k.cins}</td><td>{k.miktar}</td><td>{k.tutar.toLocaleString()} TL</td></tr>))}</tbody>
                  </table>
                </div>
                <div>
                  <h5 style={{margin: '0 0 10px 0'}}>Tahsilat/Ödeme Geçmişi</h5>
                  {seciliFirma.odemeGecmisi.map(o => (<div key={o.id} style={{fontSize: '12px', background: '#eafaf1', padding: '10px', borderRadius: '5px', marginBottom: '8px', borderLeft: '3px solid #2ecc71', display: 'flex', justifyContent: 'space-between'}}>
                    <span><strong>{o.miktar.toLocaleString()} TL</strong> - {o.tarih}</span>
                    <span style={{fontSize: '10px', color: '#666'}}>{o.aciklama}</span>
                  </div>))}
                </div>
              </div>
            </>
          ) : <div style={{textAlign: 'center', marginTop: '100px', color: '#999'}}>Sol listeden bir firma seçin.</div>}
        </div>
      </div>
    </div>
  );
}

// STİLLER
const authContainer = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' };
const authBox = { background: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', textAlign: 'center', width: '350px' };
const kart = (renk) => ({ flex: 1, background: 'white', padding: '20px', borderRadius: '12px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderBottom: `5px solid ${renk}` });
const kucukOzet = (renk) => ({ fontSize: '11px', background: renk, padding: '5px 10px', borderRadius: '6px', color: 'white', fontWeight: 'bold' });
const inp = { padding: '10px', borderRadius: '6px', border: '1px solid #ddd', outline: 'none', width: '100%', boxSizing: 'border-box' };
const btn = { padding: '10px 15px', background: '#1a3353', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };