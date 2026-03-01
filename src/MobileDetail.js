import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import './MobileDetail.css';

function MobileDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedProjects, setRelatedProjects] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const sliderRef = useRef(null);
  const [touchStart, setTouchStart] = useState(0);

  const isVideo = (url) => url && url.match(/\.(mp4|webm|ogg|mov)$/i);

  // 🔥 프로젝트 데이터 로드
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const docRef = doc(db, 'projects', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProject({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error('프로젝트 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProject();
  }, [id]);

  // 🔥 관련 프로젝트 로드
  useEffect(() => {
    if (project?.category) {
      const fetchRelatedProjects = async () => {
        try {
          const q = query(
            collection(db, 'projects'),
            where('category', '==', project.category)
          );
          const querySnapshot = await getDocs(q);
          const projects = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(p => p.id !== project.id)
            .slice(0, 6);
          setRelatedProjects(projects);
        } catch (error) {
          console.error('관련 프로젝트 로드 실패:', error);
        }
      };
      
      fetchRelatedProjects();
    }
  }, [project]);

  // 모든 이미지 수집
  const allImages = [];
  if (project?.thumbnail) {
    allImages.push(project.thumbnail);
  } else if (project?.imageUrl) {
    allImages.push(project.imageUrl);
  }
  if (project?.subImages && Array.isArray(project.subImages)) {
    allImages.push(...project.subImages);
  }

  // 🔥 스크롤 이벤트 - 현재 인덱스 감지
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const handleScroll = () => {
      const scrollLeft = slider.scrollLeft;
      const itemWidth = slider.offsetWidth;
      const newIndex = Math.round(scrollLeft / itemWidth);
      
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    };

    slider.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      slider.removeEventListener('scroll', handleScroll);
    };
  }, [currentIndex]);

  // 🔥 터치 이벤트
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchStart - touchEnd;
    
    if (distance < -100 && currentIndex === 0) {
      navigate('/');
    }
  };

  // 🔥 로딩 중
  if (loading) return null;

  // 🔥 프로젝트가 없을 때
  if (!project) {
    return (
      <div className="mobile-detail">
        <header className="mobile-detail-header">
          <div className="mobile-logo" onClick={() => navigate('/')}>
            ESSENT.STUDIO
          </div>
        </header>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Project not found</h2>
          <button onClick={() => navigate('/')}>Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-detail">
      <header className="mobile-detail-header">
        <div className="mobile-logo" onClick={() => navigate('/')}>
          <img src="/logo.png" alt="Logo" className="mobile-logo-img" />
        </div>
      </header>

      <div 
        ref={sliderRef}
        className="mobile-slider-wrapper"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mobile-slider-track">
          {allImages.length === 0 ? (
            <div className="mobile-slide">
              <div style={{ color: '#999', textAlign: 'center' }}>
                No images available
              </div>
            </div>
          ) : (
            allImages.map((media, idx) => (
              <div 
                key={idx} 
                className="mobile-slide"
              >
                {isVideo(media) ? (
                  <video 
                    src={media} 
                    autoPlay 
                    muted 
                    loop 
                    playsInline
                  />
                ) : (
                  <img 
                    src={media} 
                    alt={`${project.title} ${idx + 1}`}
                    draggable="false"
                  />
                )}
              </div>
            ))
          )}
        </div>

        {/* 🔥 Pagination Dots */}
        {allImages.length > 1 && (
          <div className="mobile-pagination">
            {allImages.map((_, idx) => (
              <div 
                key={idx}
                className={`mobile-dot ${idx === currentIndex ? 'active' : ''}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mobile-info">
        <p className="mobile-category">{project.category}</p>
        <h2>{project.title}</h2>
        {project.sub && <p className="mobile-sub">{project.sub}</p>}
        
        <div className="mobile-meta">
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

        {project.desc && (
          <div className="mobile-description">
            <p className="mobile-desc-label">DESCRIPTION</p>
            <p className="mobile-desc-text">{project.desc}</p>
          </div>
        )}
      </div>

      {/* 🔥 MORE PROJECT 섹션 */}
      {relatedProjects.length > 0 && (
        <div className="mobile-related-section">
          <h3 className="mobile-related-title">MORE PROJECT</h3>
          <div className="mobile-related-grid">
            {relatedProjects.map((item) => (
              <div 
                key={item.id} 
                className="mobile-related-card"
                onClick={() => {
                  window.location.href = `/project/${item.id}`;
                }}
              >
                <div className="mobile-related-image-wrapper">
                  {isVideo(item.thumbnail || item.imageUrl) ? (
                    <video 
                      src={item.thumbnail || item.imageUrl} 
                      className="mobile-related-image"
                      muted loop playsInline
                    />
                  ) : (
                    <img 
                      src={item.thumbnail || item.imageUrl} 
                      alt={item.title} 
                      className="mobile-related-image"
                    />
                  )}
                </div>
                <p className="mobile-related-card-title">{item.title}</p>
                {item.date && <p className="mobile-related-card-date">{item.date}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MobileDetail;