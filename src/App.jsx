import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function App() {
  const [user, setUser] = useState(null); 
  const [isLogin, setIsLogin] = useState(true); 
  const [authData, setAuthData] = useState({ username: '', password: '' });

  const [firmalar, setFirmalar] = useState([]);
  const [seciliFirmaId, setSeciliFirmaId] = useState(null);
  const [yeniFirmaAdi, setYeniFirmaAdi] = useState('');
  const [yeniKalem, setYeniKalem] = useState({ cins: '', miktar: '', tutar: '' });
  const [odemeTutari, setOdemeTutari] = useState('');
  
  // Düzenleme State'leri (Harcama Kalemleri İçin)
  const [duzenlenenId, setDuzenlenenId] = useState(null);
  const [duzenlenenVeri, setDuzenlenenVeri] = useState({ cins: '', miktar: '', tutar: '' });
  
  // --- YENİ: Ödeme Düzenleme State'leri ---
  const [duzenlenenOdemeId, setDuzenlenenOdemeId] = useState(null);
  const [duzenlenenOdemeVeri, setDuzenlenenOdemeVeri] = useState({ miktar: '', tarih: '' });
  
  const [listeAcik, setListeAcik] = useState(true);

  const API_BASE_URL = 'https://noa-backend-ax4l.onrender.com/api';

  const verileriKaydet = async (guncelListe) => {
    if (!user) return;
    try {
      await axios.post(`${API_BASE_URL}/update-data`, {
        username: user.username,
        firmalar: guncelListe
      });
    } catch (err) {
      console.error("Veritabanı hatası:", err);
    }
  };

  const handleAuth = async () => {
    const url = isLogin ? `${API_BASE_URL}/login` : `${API_BASE_URL}/register`;
    try {
      const res = await axios.post(url, authData);
      if (isLogin) {
        const userData = res.data.user;
        setUser(userData);
        setFirmalar(userData.firmalar || []);
      } else {
        alert("Kayıt başarılı! Giriş yapabilirsiniz.");
        setIsLogin(true);
      }
    } catch (err) {
      alert(err.response?.data?.error || "Sunucu hatası!");
    }
  };

  // --- HESAPLAMALAR ---
  const genelMaliyet = firmalar.reduce((t, f) => t + (f.kalemler?.reduce((kt, k) => kt + Number(k.tutar || 0), 0) || 0), 0);
  const genelOdenen = firmalar.reduce((t, f) => t + (f.odemeGecmisi?.reduce((ot, o) => ot + Number(o.miktar || 0), 0) || 0), 0);
  const genelBorc = genelMaliyet - genelOdenen;

  const seciliFirma = firmalar.find(f => f.id === seciliFirmaId);
  const fMaliyet = seciliFirma ? seciliFirma.kalemler.reduce((t, k) => t + Number(k.tutar || 0), 0) : 0;
  const fOdenen = seciliFirma ? seciliFirma.odemeGecmisi.reduce((t, o) => t + Number(o.miktar || 0), 0) : 0;
  const fBorc = fMaliyet - fOdenen;

  // --- İŞLEMLER ---
  const firmaEkle = () => {
    if (!yeniFirmaAdi.trim()) return;
    const yeni = { id: Date.now(), ad: yeniFirmaAdi, kalemler: [], odemeGecmisi: [], not: '' };
    const liste = [...firmalar, yeni];
    setFirmalar(liste);
    verileriKaydet(liste);
    setYeniFirmaAdi('');
  };

  const notGuncelle = (yeniNot) => {
    const liste = firmalar.map(f => f.id === seciliFirmaId ? { ...f, not: yeniNot } : f);
    setFirmalar(liste);
    verileriKaydet(liste);
  };

  const kalemEkle = () => {
    if (!yeniKalem.cins || !yeniKalem.tutar) return;
    const liste = firmalar.map(f => f.id === seciliFirmaId 
      ? { ...f, kalemler: [...f.kalemler, { ...yeniKalem, id: Date.now(), tutar: Number(yeniKalem.tutar) }] } : f);
    setFirmalar(liste);
    verileriKaydet(liste);
    setYeniKalem({ cins: '', miktar: '', tutar: '' });
  };

  const odemeYap = () => {
    if (!odemeTutari || Number(odemeTutari) <= 0) return;
    const liste = firmalar.map(f => f.id === seciliFirmaId ? { 
      ...f, odemeGecmisi: [...f.odemeGecmisi, { id: Date.now(), miktar: Number(odemeTutari), tarih: new Date().toLocaleDateString() }] 
    } : f);
    setFirmalar(liste);
    verileriKaydet(liste);
    setOdemeTutari('');
  };

  const duzenleKaydet = () => {
    const liste = firmalar.map(f => f.id === seciliFirmaId ? {
      ...f, kalemler: f.kalemler.map(k => k.id === duzenlenenId ? { ...k, ...duzenlenenVeri, tutar: Number(duzenlenenVeri.tutar) } : k)
    } : f);
    setFirmalar(liste);
    verileriKaydet(liste);
    setDuzenlenenId(null);
  };

  // --- YENİ: Ödeme Düzenleme Kaydetme Fonksiyonu ---
  const odemeDuzenleKaydet = () => {
    const liste = firmalar.map(f => f.id === seciliFirmaId ? {
      ...f, odemeGecmisi: f.odemeGecmisi.map(o => o.id === duzenlenenOdemeId ? { ...o, miktar: Number(duzenlenenOdemeVeri.miktar), tarih: duzenlenenOdemeVeri.tarih } : o)
    } : f);
    setFirmalar(liste);
    verileriKaydet(liste);
    setDuzenlenenOdemeId(null);
  };

  if (!user) {
    return (
      <div style={authContainer}>
        <div style={authBox}>
          <h2 style={{color: '#1a3353', marginBottom: '20px'}}>{isLogin ? 'Giriş Yap' : 'Üye Ol'}</h2>
          <input style={inp} placeholder="Kullanıcı Adı" onChange={e => setAuthData({...authData, username: e.target.value})} />
          <input style={inp} type="password" placeholder="Şifre" onKeyPress={(e) => e.key === 'Enter' && handleAuth()} onChange={e => setAuthData({...authData, password: e.target.value})} />
          <button style={btn} onClick={handleAuth}>{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</button>
          <p style={{cursor: 'pointer', fontSize: '14px', marginTop: '15px'}} onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Hesabınız yok mu? Üye olun' : 'Zaten üyeyim? Giriş yapın'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', padding: '20px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center'}}>
        <h2 style={{color: '#1a3353', margin: 0}}>NOA PROJE YÖNETİMİ</h2>
        <div style={{fontSize: '14px'}}>Hoş geldin, <b>{user.username}</b> | <span style={{cursor: 'pointer', color: 'red'}} onClick={() => window.location.reload()}>Güvenli Çıkış</span></div>
      </div>
      
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
        <div style={kart('#3498db')}>Genel Maliyet: {genelMaliyet.toLocaleString()} TL</div>
        <div style={kart('#2ecc71')}>Toplam Ödenen: {genelOdenen.toLocaleString()} TL</div>
        <div style={{ ...kart('#e74c3c'), color: '#e74c3c' }}>Net Borç: {genelBorc.toLocaleString()} TL</div>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ width: '320px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', alignSelf: 'flex-start' }}>
          <div onClick={() => setListeAcik(!listeAcik)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: listeAcik ? '15px' : '0' }}>
            <h4 style={{margin: 0}}>Cari Firmalar</h4>
            <span style={{ fontSize: '18px' }}>{listeAcik ? '▼' : '▲'}</span>
          </div>

          {listeAcik && (
            <>
              <div style={{display: 'flex', gap: '5px', marginBottom: '15px'}}>
                <input value={yeniFirmaAdi} onChange={e => setYeniFirmaAdi(e.target.value)} placeholder="Firma Ekle..." style={inp} />
                <button onClick={firmaEkle} style={btn}>+</button>
              </div>
              <div style={{maxHeight: '500px', overflowY: 'auto'}}>
                {firmalar.map(f => {
                  const odenen = f.odemeGecmisi?.reduce((a, b) => a + b.miktar, 0) || 0;
                  return (
                    <div key={f.id} onClick={() => setSeciliFirmaId(f.id)} style={{ 
                      padding: '12px', cursor: 'pointer', background: seciliFirmaId === f.id ? '#1a3353' : '#f8f9fa', 
                      color: seciliFirmaId === f.id ? 'white' : 'black', margin: '8px 0', borderRadius: '8px',
                      display: 'flex', justifyContent: 'space-between', border: '1px solid #ddd'
                    }}>
                      <strong>{f.ad}</strong>
                      <span style={{fontSize: '11px', opacity: 0.8}}>{odenen.toLocaleString()} TL</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div style={{ flex: 1, background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          {seciliFirma ? (
            <>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h3 style={{margin: 0}}>{seciliFirma.ad} Detaylı Analiz</h3>
                <div style={{display: 'flex', gap: '10px'}}>
                  <div style={kucukOzet('#3498db')}>Maliyet: {fMaliyet.toLocaleString()} TL</div>
                  <div style={kucukOzet('#2ecc71')}>Ödenen: {fOdenen.toLocaleString()} TL</div>
                  <div style={kucukOzet('#e74c3c')}>Borç: {fBorc.toLocaleString()} TL</div>
                </div>
              </div>

              <div style={{marginBottom: '20px'}}>
                <label style={{fontSize: '13px', color: '#666', fontWeight: 'bold'}}>Firma Notları / Açıklama:</label>
                <textarea value={seciliFirma.not} onChange={(e) => notGuncelle(e.target.value)} style={{...inp, height: '80px', marginTop: '5px', resize: 'vertical', border: '1px solid #3498db'}} placeholder="Firmaya dair özel notlarınızı buraya girebilirsiniz..." />
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
                  <strong style={{fontSize: '14px', color: '#27ae60'}}>Nakit Ödeme:</strong>
                  <input placeholder="Ödeme Miktarı..." type="number" value={odemeTutari} onChange={e => setOdemeTutari(e.target.value)} style={inp} />
                  <button onClick={odemeYap} style={{ ...btn, background: '#2ecc71', width: '200px' }}>Ödemeyi Tamamla</button>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px'}}>
                <div>
                  <h5 style={{margin: '0 0 10px 0'}}>Harcama Kalemleri</h5>
                  <table width="100%" style={{borderCollapse: 'collapse', fontSize: '14px'}}>
                    <thead><tr style={{borderBottom: '2px solid #eee', textAlign: 'left'}}><th>Hizmet</th><th>Miktar</th><th>Tutar</th><th>İşlem</th></tr></thead>
                    <tbody>
                      {seciliFirma.kalemler.map(k => (
                        <tr key={k.id} style={{borderBottom: '1px solid #f9f9f9'}}>
                          {duzenlenenId === k.id ? (
                            <>
                              <td><input style={inp} value={duzenlenenVeri.cins} onChange={e => setDuzenlenenVeri({ ...duzenlenenVeri, cins: e.target.value })} /></td>
                              <td><input style={inp} value={duzenlenenVeri.miktar} onChange={e => setDuzenlenenVeri({ ...duzenlenenVeri, miktar: e.target.value })} /></td>
                              <td><input style={inp} type="number" value={duzenlenenVeri.tutar} onChange={e => setDuzenlenenVeri({ ...duzenlenenVeri, tutar: e.target.value })} /></td>
                              <td><button onClick={duzenleKaydet} style={btn}>Kaydet</button></td>
                            </>
                          ) : (
                            <>
                              <td style={{padding: '12px 0'}}>{k.cins}</td>
                              <td>{k.miktar}</td>
                              <td>{k.tutar.toLocaleString()} TL</td>
                              <td><button onClick={() => { setDuzenlenenId(k.id); setDuzenlenenVeri(k); }} style={{background: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', fontSize: '11px'}}>Düzenle</button></td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{borderLeft: '2px solid #eee', paddingLeft: '20px'}}>
                  <h5 style={{margin: '0 0 10px 0'}}>Tahsilat/Ödeme Geçmişi</h5>
                  {seciliFirma.odemeGecmisi.map(o => (
                    <div key={o.id} style={{background: '#eafaf1', padding: '10px', borderRadius: '5px', marginBottom: '8px', fontSize: '12px', borderLeft: '3px solid #2ecc71'}}>
                      {duzenlenenOdemeId === o.id ? (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                          <input style={{...inp, padding: '5px'}} type="date" value={duzenlenenOdemeVeri.tarih} onChange={e => setDuzenlenenOdemeVeri({...duzenlenenOdemeVeri, tarih: e.target.value})} />
                          <input style={{...inp, padding: '5px'}} type="number" value={duzenlenenOdemeVeri.miktar} onChange={e => setDuzenlenenOdemeVeri({...duzenlenenOdemeVeri, miktar: e.target.value})} />
                          <button onClick={odemeDuzenleKaydet} style={{...btn, padding: '5px', fontSize: '10px'}}>Kaydet</button>
                        </div>
                      ) : (
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <div>
                            <span style={{color: '#666'}}>{o.tarih}</span><br/>
                            <strong>{o.miktar.toLocaleString()} TL</strong>
                          </div>
                          <button onClick={() => { setDuzenlenenOdemeId(o.id); setDuzenlenenOdemeVeri({ miktar: o.miktar, tarih: o.tarih }); }} style={{background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline'}}>Düzenle</button>
                        </div>
                      )}
                    </div>
                  ))}
                  {seciliFirma.odemeGecmisi.length === 0 && <small style={{color: '#999'}}>Henüz ödeme kaydı bulunmuyor.</small>}
                </div>
              </div>
            </>
          ) : <div style={{textAlign: 'center', marginTop: '100px', color: '#999'}}>Sol listeden bir firma seçerek detayları görüntüleyebilirsiniz.</div>}
        </div>
      </div>
    </div>
  );
}

// Stil bileşenleri aynı kaldı...
const authContainer = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' };
const authBox = { background: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', textAlign: 'center', width: '350px' };
const kart = (renk) => ({ flex: 1, background: 'white', padding: '20px', borderRadius: '12px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderBottom: `5px solid ${renk}` });
const kucukOzet = (renk) => ({ fontSize: '12px', background: renk, padding: '6px 12px', borderRadius: '6px', color: 'white', fontWeight: 'bold' });
const inp = { padding: '10px', borderRadius: '6px', border: '1px solid #ddd', outline: 'none', width: '100%', boxSizing: 'border-box' };
const btn = { padding: '10px 15px', background: '#1a3353', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };