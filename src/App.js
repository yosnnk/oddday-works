import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import './Mobile.css';
import './MobileDetail.css';
import Detail from './Detail';
import MobileDetail from './MobileDetail';
import emailjs from '@emailjs/browser';
import AdminPage from './AdminPage';
import Upload from './Upload';
import { collection, getDocs, doc, getDoc} from 'firebase/firestore';
import { db } from './firebase';  
import Login from './Login';
import SplashScreen from './SplashScreen';

// ==============================================================================
// 1. MainPage 컴포넌트
// ==============================================================================
function MainPage({ firestoreProjects, loading, categoriesStd, categoriesLab }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('Std'); 
  const [category, setCategory] = useState('All Project');
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  
  const [selectedProject, setSelectedProject] = useState(null);

  const [form, setForm] = useState({ name: '', content: '', email: '' });
  const [errors, setErrors] = useState({ name: '', content: '', email: '' });

  const isVideo = (url) => {
    return url && url.match(/\.(mp4|webm|ogg|mov)$/i);
  };

  const handleReset = () => {
    window.scrollTo(0, 0);
    setCategory('All Project');
    setForm({ name: '', content: '', email: '' });
    setErrors({});
    setMenuOpen(false); 
    navigate('/');
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault(); 
    let newErrors = {};

    if (!form.name.trim()) newErrors.name = '* 필수 항목입니다.';
    if (!form.content.trim()) newErrors.content = '* 필수 항목입니다.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
    if (!form.email.trim()) newErrors.email = '* 필수 항목입니다.';
    else if (!emailRegex.test(form.email)) newErrors.email = '* 올바른 이메일 형식이 아닙니다.'; 

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      const templateParams = {
        from_name: form.name,
        reply_to: form.email,
        message: form.content
      };

      emailjs.send('service_hfs38si', 'template_xp7gpyd', templateParams, 'p8OFe59tE2kL-an3F')
      .then(() => {
        alert('문의가 성공적으로 전송되었습니다!');
        setForm({ name: '', content: '', email: '' });
      })
      .catch((error) => {
        console.error('EmailJS 오류:', error);
        alert('전송 중 오류가 발생했습니다.');
      });
    }
  };

  const currentCategories = mode === 'Std' ? categoriesStd : categoriesLab;
  const modeFilteredProjects = firestoreProjects.filter(p => p.mode === mode);
  
  const filteredProjects = modeFilteredProjects
    .filter(project => {
      const categoryMatch = category === 'All Project' || project.category === category;
      const searchMatch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (project.sub && project.sub.toLowerCase().includes(searchTerm.toLowerCase()));
      return categoryMatch && searchMatch;
    })
    .sort((a, b) => {
      const dateA = a.date || '0';
      const dateB = b.date || '0';
      return dateB.localeCompare(dateA);
    });

  const handleCardClick = (project, projectIndex) => {
    if (window.innerWidth <= 768) {
      setSelectedProject({
        ...project,
        currentIndex: projectIndex,
        allProjects: filteredProjects
      });
    } else {
      navigate(`/project/${project.id}`, { state: { project } });
    }
  };

  return (
    <div className="App">
      <header 
        className={`header ${selectedProject ? 'detail-open' : ''}`}
        style={{ zIndex: selectedProject ? 300 : 205 }}
      >
        <div className="logo" onClick={handleReset}>
          <img src="/logo.png" alt="ESSENT.STUDIO" className="logo-img" />
        </div>
        <div className="nav-switch" style={{ 
            opacity: menuOpen || selectedProject ? 0 : 1, 
            pointerEvents: menuOpen || selectedProject ? 'none' : 'auto',
            transition: 'opacity 0.2s ease'
          }}>
          <span className={mode === 'Std' ? 'active' : ''} onClick={() => { setMode('Std'); setCategory('All Project'); }}>Work</span> 
          <span style={{color: '#121212', margin: '0 4px'}}>/</span> 
          <span className={mode === 'Lab' ? 'active' : ''} onClick={() => { setMode('Lab'); setCategory('All Project'); }}>Zine</span>
        </div>
        
        <div className="lets-talk">Let's Talk</div>
        
        <div 
          className={`hamburger-menu ${menuOpen || selectedProject ? 'open' : ''}`}
          onClick={() => {
            if (selectedProject) {
              setSelectedProject(null);
            } else {
              setMenuOpen(!menuOpen);
            }
          }}
        >
          <span></span>
          <span></span>
        </div>
      </header>

      <div className="container">
        <main className="left-content">
          <div className="sub-header">
            <div className="filter-bar">
              <span className={`filter-item ${category === 'All Project' ? 'active' : ''}`} onClick={() => setCategory('All Project')}>All Project</span>
              {currentCategories.map(cat => (
                <span key={cat} className={`filter-item ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>{cat}</span>
              ))}
            </div>
          </div>

          <div className="title-area">
            <h1 style={{fontSize: '40px', fontWeight: '600', lineHeight:'1', margin: 0}}>{category}</h1>
            <input type="text" placeholder="Search..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          {loading ? (
            <div style={{padding: '40px', textAlign: 'center', color: '#888'}}>프로젝트 불러오는 중...</div>
          ) : filteredProjects.length === 0 ? (
            <div style={{padding: '40px', textAlign: 'center', color: '#888'}}>{searchTerm ? '검색 결과가 없습니다.' : '아직 프로젝트가 없습니다.'}</div>
          ) : (
            <div className="masonry-grid">
              {filteredProjects.map((project, index) => {
                const projectType = project.type || 'tall';
                
                const imageCount = (() => {
                  let count = 0;
                  if (project.thumbnail) count++;
                  else if (project.imageUrl) {
                    count += Array.isArray(project.imageUrl) ? project.imageUrl.length : 1;
                  }
                  if (project.subImages && Array.isArray(project.subImages)) {
                    count += project.subImages.length;
                  }
                  return count;
                })();

                return (
                  <div 
                    className={`project-card ${projectType}`}
                    key={project.id} 
                    onClick={() => handleCardClick(project, index)}
                  >
                    {project.thumbnail && isVideo(project.thumbnail) ? (
                      <video 
                        src={project.thumbnail}
                        className="project-img"
                        autoPlay muted loop playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img 
                        src={project.thumbnail || project.imageUrl} 
                        alt={project.title}
                        loading="lazy"
                        className="project-img"
                      />
                    )}
                    
                    {imageCount > 1 && window.innerWidth <= 768 && (
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        zIndex: 2
                      }}>
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                          <defs>
                            <mask id={`card-mask-${project.id}`}>
                              <rect width="20" height="20" fill="white"/>
                              <rect x="-1" y="-1" width="15" height="15" rx="3" fill="black"/>
                            </mask>
                          </defs>
                          
                          <rect 
                            x="3" 
                            y="3" 
                            width="13" 
                            height="13" 
                            rx="2.5" 
                            fill="rgba(255, 255, 255, 0.8)"
                            mask={`url(#card-mask-${project.id})`}
                            style={{filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.15))'}}
                          />
                          
                          <rect 
                            x="0" 
                            y="0" 
                            width="13" 
                            height="13" 
                            rx="2.5" 
                            fill="#FFFFFF"
                            style={{filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'}}
                          />
                        </svg>
                      </div>
                    )}
                    
                    <div className="card-overlay">
  <div>
    {project.category && (
      <p style={{fontSize: '12px', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px'}}>
        {project.category}
      </p>
    )}
    <h3 style={{fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: '#fff'}}>
      {project.title}
    </h3>
    <div style={{fontSize: '13px', lineHeight: '1.5'}}>
      {project.client && (
        <p style={{margin: '0 0 2px 0'}}>
          <span style={{color: '#888', marginRight: '12px'}}>Client</span>
          <span style={{color: '#fff'}}>{project.client}</span>
        </p>
      )}
      {project.role && (
        <p style={{margin: '0 0 2px 0'}}>
          <span style={{color: '#888', marginRight: '12px'}}>Role</span>
          <span style={{color: '#fff'}}>{project.role}</span>
        </p>
      )}
      {project.date && (
        <p style={{margin: '0'}}>
          <span style={{color: '#888', marginRight: '12px'}}>Date</span>
          <span style={{color: '#fff'}}>{project.date}</span>
        </p>
      )}
    </div>
  </div>
</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mobile-footer-content" style={{ padding: '40px 20px 30px 20px' }}>
            <div className="intro-text" style={{marginTop: 0}}>
              <p>ODD DAY WORKS는 일상 속 낯설고 기묘한 영감을 다채로운 디자인으로 시각화하는 스튜디오입니다.</p>
              <p>우리의 작업은 종종 이상할 수 있습니다. 한계나 제한을 두지 않고 계속해서 실험하고 도전합니다.</p>
              <p>계속해서 배우고 정리하며, 의도를 정확히 전달하고 이해하는 과정을 통해 소통이 되는 디자이너로 일하기 위해 운영됩니다.</p>
            </div>
            
            <div className="contact-info">
              <div className="contact-row">
                <span className="contact-label">Email</span>
                <span className="contact-value"><a href="mailto:Essent.std@gmail.com">oddday.works@gmail.com</a></span>
              </div>
              <div className="contact-row">
                <span className="contact-label">Instagram</span>
                <span className="contact-value"><a href="https://www.instagram.com/oddday.works" target="_blank" rel="noopener noreferrer">@oddday.works</a></span>
              </div>
              <div className="contact-row">
                <span className="contact-label">Behance</span>
                <span className="contact-value"><a href="https://www.behance.net/odddayworks" target="_blank" rel="noopener noreferrer">@oddday.works</a></span>
              </div>
            </div>
          </div>
        </main>

        <aside className="right-sidebar">
          <div className="intro-text">
            <p style={{marginBottom: '24px'}}>ODD DAY WORKS는 일상 속 낯설고 기묘한 영감을 다채로운 디자인으로 시각화하는 스튜디오입니다.</p>
            <p style={{marginBottom: '24px'}}>우리의 작업은 종종 이상할 수 있습니다. 한계나 제한을 두지 않고 계속해서 실험하고 도전합니다. </p>
            <p>계속해서 배우고 정리하며, 의도를 정확히 전달하고 이해하는 과정을 통해 소통이 되는 디자이너로 일하기 위해 운영됩니다.</p>
          </div>
          <div className="contact-info">
            <div className="contact-row"><span className="contact-label">Email</span><span className="contact-value"><a href="mailto:oddday.works@gmail.com">oddday.works@gmail.com</a></span></div>
            <div className="contact-row"><span className="contact-label">Instagram</span><span className="contact-value"><a href="https://www.instagram.com/oddday.works" target="_blank" rel="noopener noreferrer">@oddday.works</a></span></div>
            <div className="contact-row"><span className="contact-label">Behance</span><span className="contact-value"><a href="https://www.behance.net/odddayworks" target="_blank" rel="noopener noreferrer">@oddday.works</a></span></div>
          </div>
          <div className="contact-form-area">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom:'1px solid #333', paddingBottom:'12px', marginBottom:'15px'}}>
              <h3 style={{fontSize:'22px', fontWeight:'normal', margin: 0}}>프로젝트 문의</h3>
              <button className="submit-btn" type="button" onClick={handleSubmit}>문의하기</button>
            </div>
            <form className="contact-form">
              <div className="input-group">
                <label className="form-label">담당자 이름</label>
                <input type="text" name="name" value={form.name} onChange={handleInput} className="form-input" />
                {errors.name && <p style={{color:'#ff3b30', fontSize:'13px', marginTop:'6px'}}>{errors.name}</p>}
              </div>
              <div className="input-group">
                <label className="form-label">프로젝트 내용</label>
                <textarea name="content" rows="4" value={form.content} onChange={handleInput} className="form-textarea"></textarea>
                {errors.content && <p style={{color:'#ff3b30', fontSize:'13px', marginTop:'6px'}}>{errors.content}</p>}
              </div>
              <div className="input-group">
                <label className="form-label">EMAIL</label>
                <input type="email" name="email" value={form.email} onChange={handleInput} className="form-input" />
                {errors.email && <p style={{color:'#ff3b30', fontSize:'13px', marginTop:'6px'}}>{errors.email}</p>}
              </div>
            </form>
          </div>
        </aside>
      </div>

      <div className={`mobile-menu-overlay ${menuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-content">
          <h2 className="mobile-menu-title">Let's Talk</h2>
          
          <div className="intro-text" style={{marginTop: 0}}>
            <p style={{marginBottom: '20px'}}>ODD DAY WORKS는 일상 속 낯설고 기묘한 영감을 다채로운 디자인으로 시각화하는 스튜디오입니다.</p>
            <p style={{marginBottom: '20px'}}>우리의 작업은 종종 이상할 수 있습니다. 한계나 제한을 두지 않고 계속해서 실험하고 도전합니다.</p>
            <p>ODD DAY WORKS는 계속해서 배우고 정리하며, 의도를 정확히 전달하고 이해하는 과정을 통해 소통이 되는 디자이너로 일하기 위해 운영됩니다.</p>
          </div>

          <div className="contact-info" style={{marginTop: '40px', marginBottom: '40px'}}>
            <div className="contact-row">
              <span className="contact-label" style={{width:'100px'}}>Email</span>
              <span className="contact-value"><a href="mailto:oddday.works@gmail.com">oddday.works@gmail.com</a></span>
            </div>
            <div className="contact-row">
              <span className="contact-label" style={{width:'100px'}}>Instagram</span>
              <span className="contact-value"><a href="https://www.instagram.com/oddday.works" target="_blank" rel="noopener noreferrer">@oddday.works</a></span>
            </div>
            <div className="contact-row">
              <span className="contact-label" style={{width:'100px'}}>Behance</span>
              <span className="contact-value"><a href="https://www.behance.net/odddayworks" target="_blank" rel="noopener noreferrer">@oddday.works</a></span>
            </div>
          </div>

          <div className="contact-form-area">
            <div className="form-header-area">
              <h3>프로젝트 문의</h3>
              <button className="form-submit-btn" type="button" onClick={handleSubmit}>문의하기</button>
            </div>

            <form className="contact-form">
              <div className="input-group">
                <label className="form-label">담당자 이름</label>
                <input type="text" name="name" value={form.name} onChange={handleInput} className="form-input" />
                {errors.name && <p style={{color:'#ff3b30', fontSize:'13px', marginTop:'6px'}}>{errors.name}</p>}
              </div>

              <div className="input-group">
                <label className="form-label">프로젝트 내용</label>
                <textarea name="content" value={form.content} onChange={handleInput} className="form-textarea"></textarea>
                {errors.content && <p style={{color:'#ff3b30', fontSize:'13px', marginTop:'6px'}}>*필수 항목입니다.</p>}
              </div>

              <div className="input-group">
                <label className="form-label">EMAIL</label>
                <input type="email" name="email" value={form.email} onChange={handleInput} className="form-input" />
                {errors.email && <p style={{color:'#ff3b30', fontSize:'13px', marginTop:'6px'}}>{errors.email}</p>}
              </div>
            </form>
          </div>
        </div>
      </div>

      {selectedProject && (
        <MobileDetailOverlay 
          project={selectedProject} 
          onClose={() => setSelectedProject(null)} 
        />
      )}
    </div>
  );
}

function MobileDetailOverlay({ project, onClose }) {
  const containerRef = useRef(null);
  const infoSectionRef = useRef(null);
  const [isClosing, setIsClosing] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [showFixedInfo, setShowFixedInfo] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);


  const isVideo = useCallback((url) => {
    return url && url.match(/\.(mp4|webm|ogg|mov)$/i);
  }, []);


  const allImages = useMemo(() => {
    const images = [];
    
    if (project?.thumbnail) {
      images.push(project.thumbnail);
    } else if (project?.imageUrl) {
      if (Array.isArray(project.imageUrl)) {
        images.push(...project.imageUrl);
      } else {
        images.push(project.imageUrl);
      }
    }
    
    if (project?.subImages && Array.isArray(project.subImages)) {
      images.push(...project.subImages);
    }
    
    return images;
  }, [project]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  const handleTouchStart = useCallback((e) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (touchStart.x < 30) {
      e.preventDefault();
    }
  }, [touchStart]);

  const handleTouchEnd = useCallback((e) => {
    const container = containerRef.current;
    if (!container) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;

    const isAtTop = container.scrollTop <= 10;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY) * 1.5;

    if (isAtTop && isHorizontalSwipe && distanceX < -70) {
      handleClose();
    }

    setTouchStart({ x: 0, y: 0 });
  }, [touchStart, handleClose]);

  const handleScroll = useCallback(() => {
    if (!isInitialized) return;
    
    const container = containerRef.current;
    const infoSection = infoSectionRef.current;
    if (!container || !infoSection) return;

    const containerRect = container.getBoundingClientRect();
    const infoRect = infoSection.getBoundingClientRect();
    
    if (infoRect.top < containerRect.bottom - 10) {
      setShowFixedInfo(false);
    } else {
      setShowFixedInfo(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.touchAction = 'none';
    
    window.history.pushState(null, '', window.location.href);
    
    const handlePopState = (e) => {
      window.history.pushState(null, '', window.location.href);
    };
    
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.touchAction = '';
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      
      const timer = setTimeout(() => {
        const infoSection = infoSectionRef.current;
        if (container && infoSection) {
          const containerRect = container.getBoundingClientRect();
          const infoRect = infoSection.getBoundingClientRect();
          
          if (infoRect.top < containerRect.bottom - 10) {
            setShowFixedInfo(false);
          } else {
            setShowFixedInfo(true);
          }
        }
        setIsInitialized(true);
      }, 300);
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
        clearTimeout(timer);
      };
    }
  }, [handleScroll]);

  useEffect(() => {
    allImages.forEach((src) => {
      if (!isVideo(src)) {
        const img = new Image();
        img.src = src;
      }
    });
  }, [allImages, isVideo]);

  return (
    <div 
      ref={containerRef}
      className={`mobile-detail-overlay ${isClosing ? 'closing' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      <div className="mobile-overlay-header">
        <div className="overlay-logo" onClick={handleClose}>
          ESSENT.STUDIO
        </div>
        <div style={{ width: '30px' }}></div>
      </div>

      <div className="mobile-detail-content">
        <div className="mobile-images-vertical">
          {allImages.map((src, idx) => (
            <div key={idx} className="mobile-image-item">
              {isVideo(src) ? (
                <video 
                  src={src}
                  autoPlay 
                  muted 
                  loop 
                  playsInline
                />
              ) : (
                <img 
                  src={src}
                  alt={`${project.title} ${idx + 1}`}
                  draggable="false"
                />
              )}
            </div>
          ))}
        </div>

        <div ref={infoSectionRef} className="mobile-info-section">
          <div className="mobile-info-header">
            <div className="mobile-info-tags">
              {project.category && (
                <span className="mobile-tag primary">{project.category}</span>
              )}
            </div>
            <h1 className="mobile-info-title">{project.title}</h1>
          </div>

          {project.description && (
            <>
              <div className="mobile-info-divider" />
              <p className="mobile-info-desc">{project.description}</p>
            </>
          )}

          <div className="mobile-info-meta">
            {project.client && (
              <div className="mobile-meta-row">
                <span className="mobile-meta-label">Client</span>
                <span className="mobile-meta-value">{project.client}</span>
              </div>
            )}
            {project.role && (
              <div className="mobile-meta-row">
                <span className="mobile-meta-label">Role</span>
                <span className="mobile-meta-value">{project.role}</span>
              </div>
            )}
            {project.date && (
              <div className="mobile-meta-row">
                <span className="mobile-meta-label">Date</span>
                <span className="mobile-meta-value">{project.date}</span>
              </div>
            )}
          </div>
        </div>

      </div>

      <div 
        className={`mobile-fixed-info ${showFixedInfo ? 'visible' : 'hidden'}`}
      >
        <div className="mobile-fixed-info-content">
          <div className="mobile-fixed-tags">
            {project.category && (
              <span className="mobile-tag primary">{project.category}</span>
            )}
          </div>
          <h2 className="mobile-fixed-title">{project.title}</h2>
          {project.client && (
            <p className="mobile-fixed-client">{project.client}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// DetailRouter 컴포넌트
// ==============================================================================
function DetailRouter() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth <= 768;
      if (newIsMobile !== isMobile) {
        navigate('/');
      }
      setIsMobile(newIsMobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, navigate]);

  useEffect(() => {
    document.body.classList.add('detail-open');
    
    return () => {
      document.body.classList.remove('detail-open');
    };
  }, []);

  return isMobile ? <MobileDetail /> : <Detail />;
}

/// ==============================================================================
// App 컴포넌트
// ==============================================================================
function App() {
  const [showSplash, setShowSplash] = useState(true); // 🔥 스플래시 상태 추가
  const [firestoreProjects, setFirestoreProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesStd, setCategoriesStd] = useState([]);
  const [categoriesLab, setCategoriesLab] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectsSnapshot = await getDocs(collection(db, 'projects'));
        const projects = projectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFirestoreProjects(projects);

        const categoryDoc = await getDoc(doc(db, 'settings', 'categories'));
        if (categoryDoc.exists()) {
          const data = categoryDoc.data();
          setCategoriesStd(data.std || []);
          setCategoriesLab(data.lab || []);
        }
      } catch (error) {
        console.error('데이터 불러오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 🔥 스플래시 화면 먼저 보여주기
 if (showSplash || loading) {
    return <SplashScreen onFinish={() => setShowSplash(false)} dataReady={!loading} />;
  }

  return (
    <Routes>
      <Route path="/" element={
        <MainPage 
          firestoreProjects={firestoreProjects} 
          loading={loading}
          categoriesStd={categoriesStd}
          categoriesLab={categoriesLab}
        />  
      } />
      <Route path="/project/:id" element={<DetailRouter />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/upload" element={<Upload />} />
    </Routes>
  );
}
  
export default App;