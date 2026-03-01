import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from './firebase'; 
import { onAuthStateChanged } from 'firebase/auth'; 
import './Detail.css';

function Detail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const CLOUD_NAME = "dcy83vtu9"; 
  const UPLOAD_PRESET = "portfolio_preset";

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [relatedProjects, setRelatedProjects] = useState([]);

  const isVideo = (url) => {
    return url && url.match(/\.(mp4|webm|ogg|mov)$/i);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setProject(null);
    setLoading(true);
    setRelatedProjects([]);

    const fetchProject = async () => {
      try {
        if (location.state?.project?.id === id) {
          setProject(location.state.project);
          setLoading(false);
          return;
        }
        const docRef = doc(db, 'projects', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProject({ id: docSnap.id, ...docSnap.data() });
        } else {
          alert('프로젝트를 찾을 수 없습니다.');
          navigate('/');
        }
      } catch (error) {
        console.error('프로젝트 로드 실패:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
            .slice(0, 4);
          setRelatedProjects(projects);
        } catch (error) {
          console.error('관련 프로젝트 로드 실패:', error);
        }
      };
      
      fetchRelatedProjects();
    }
  }, [project]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('파일을 선택해주세요.');
      return;
    }

    setUploading(true);
    const uploadedUrls = [];

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
          { method: 'POST', body: formData }
        );

        const data = await response.json();
        uploadedUrls.push(data.secure_url);
      }

      const docRef = doc(db, 'projects', project.id);
      const currentSubImages = project.subImages || []; 
      const newSubImages = [...currentSubImages, ...uploadedUrls];
      
      await updateDoc(docRef, { subImages: newSubImages });

      alert('상세 파일 추가 완료! 🎉');
      
      setProject(prev => ({ ...prev, subImages: newSubImages }));
      setSelectedFiles([]); 

    } catch (error) {
      console.error('업로드 실패:', error);
      alert('업로드 실패.. 다시 시도해주세요.');
    } finally {
      setUploading(false);
    }
  };

 if (loading) return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: '#ffffff',
      zIndex: 999
    }} />
  );
  if (!project) return null;

  const mainImage = project.thumbnail || project.imageUrl;
  const allImages = [mainImage, ...(project.subImages || [])].filter(Boolean);

  return (
    <div className="detail-container">
      <header className="header">
        <div className="logo" onClick={() => navigate('/')} style={{cursor: 'pointer'}}>
          <img src="/logo.png" alt="Logo" className="logo-img" />
        </div>
        <div className="hamburger-menu open" onClick={() => navigate('/')}>
          <span></span>
          <span></span>
        </div>
      </header>

      <div className="detail-content">
        <div className="detail-info">
          <p className="detail-category">{project.category || 'Project'}</p>
          <h1 className="detail-title">{project.title}</h1>
          {project.sub && <p className="detail-subtitle">{project.sub}</p>}
          
          <div className="detail-meta">
            {project.client && (
              <div className="meta-row">
                <span className="meta-label">Client</span>
                <span className="meta-value">{project.client}</span>
              </div>
            )}
            {project.role && (
              <div className="meta-row">
                <span className="meta-label">Role</span>
                <span className="meta-value">{project.role}</span>
              </div>
            )}
            {project.date && (
              <div className="meta-row">
                <span className="meta-label">Date</span>
                <span className="meta-value">{project.date}</span>
              </div>
            )}
          </div>

          {project.desc && (
            <div className="detail-description">
              <p className="desc-label">DESCRIPTION</p>
              <p className="desc-text">{project.desc}</p>
            </div>
          )}

          {isAdmin && (
            <div className="admin-upload-section">
              <h4>📸 상세 파일 추가</h4>
              <input 
                type="file" 
                multiple 
                accept="image/*, video/*"
                onChange={handleFileSelect}
              />
              {selectedFiles.length > 0 && (
                <button onClick={handleUpload} disabled={uploading}>
                  {uploading ? '업로드 중...' : '추가하기'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="detail-images">
          {allImages.map((imgUrl, idx) => (
            <div key={idx} className="detail-image-wrapper">
              {isVideo(imgUrl) ? (
                <video 
                  src={imgUrl} 
                  className="detail-image" 
                  controls autoPlay muted loop playsInline 
                />
              ) : (
                <img src={imgUrl} alt={`${project.title} ${idx + 1}`} className="detail-image" />
              )}
            </div>
          ))}
        </div>
      </div>

      {relatedProjects.length > 0 && (
        <div className="related-section">
          <h2 className="related-title">MORE PROJECT</h2>
          <div className="related-grid">
            {relatedProjects.map((item) => (
              <div 
                key={item.id} 
                className="related-card"
                onClick={() => {
                  window.scrollTo(0, 0);
                  navigate(`/project/${item.id}`);
                }}
              >
                <div className="related-image-wrapper">
                  {isVideo(item.thumbnail || item.imageUrl) ? (
                    <video 
                      src={item.thumbnail || item.imageUrl} 
                      className="related-image"
                      muted loop playsInline
                    />
                  ) : (
                    <img 
                      src={item.thumbnail || item.imageUrl} 
                      alt={item.title} 
                      className="related-image"
                    />
                  )}
                </div>
                <div className="related-card-info">
                  <p className="related-card-title">{item.title}</p>
                  {item.date && <p className="related-card-date">{item.date}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Detail;