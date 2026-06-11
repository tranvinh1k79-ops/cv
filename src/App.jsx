import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useParams
} from "react-router-dom";
import { getExperiences, getProfile, getSkills } from "./services/profileService";
import {
  getFeaturedProjects,
  getProjectBySlug,
  getProjects
} from "./services/projectService";
import { getLatestNews, getNews, getNewsBySlug } from "./services/newsService";
import {
  fallbackCertificates,
  fallbackEducation,
  fallbackProfile,
  visualKinds
} from "./data/fallbackData";
import cvReferenceAvatar from "./assets/cv-reference-avatar.jpg";

const ADMIN_PASSWORD = "1";
const DEFAULT_SITE_TITLE = "Portfolio";
const DEFAULT_SKILL_GROUPS = ["Frontend", "Backend", "Database", "Tools", "AI"];
const CONTENT_API_ENDPOINT = "/api/admin-content";
const CONTENT_FIELDS = ["profile", "cv", "projects", "news", "contact"];
const STORAGE_KEYS = {
  session: "tv_portfolio_admin_session",
  profile: "tv_portfolio_profile_draft",
  cv: "tv_portfolio_cv_draft",
  projects: "tv_portfolio_projects_draft",
  news: "tv_portfolio_news_draft",
  contact: "tv_portfolio_contact_draft",
  theme: "tv_portfolio_sea_green_theme"
};

const fallbackSkills = [
  { name: "React", category: "Frontend" },
  { name: "Vue.js", category: "Frontend" },
  { name: "HTML5", category: "Frontend" },
  { name: "CSS3", category: "Frontend" },
  { name: "SASS", category: "Frontend" },
  { name: "Node.js", category: "Backend" },
  { name: "Python", category: "Backend" },
  { name: "Django", category: "Backend" },
  { name: "RESTful APIs", category: "Backend" },
  { name: "Supabase", category: "Database" },
  { name: "PostgreSQL", category: "Database" },
  { name: "MongoDB", category: "Database" },
  { name: "MySQL", category: "Database" },
  { name: "Git", category: "Tools" },
  { name: "Docker", category: "Tools" },
  { name: "AWS", category: "Tools" },
  { name: "Webpack", category: "Tools" },
  { name: "ChatGPT", category: "AI" },
  { name: "Prompt Engineering", category: "AI" }
];

const skillGroupOrder = DEFAULT_SKILL_GROUPS;

const fallbackExperiences = [
  {
    company: "Independent Projects",
    position: "Fullstack Developer",
    time: "2022 - Hiện tại",
    description: "Xây dựng portfolio, dashboard dữ liệu và ứng dụng web với React, Node.js, Firebase và Supabase."
  },
  {
    company: "Product Lab",
    position: "Frontend Developer",
    time: "2020 - 2022",
    description: "Triển khai giao diện responsive, component dùng lại và luồng dữ liệu cho các sản phẩm nội bộ."
  }
];

const fallbackProjects = [
  {
    id: "local-agri-price",
    title: "App giá cả nông sản",
    slug: "app-gia-ca-nong-san",
    description: "Ứng dụng theo dõi, phân tích và thông báo giá nông sản theo khu vực.",
    content: "## Tổng quan\nỨng dụng giúp người dùng xem giá nông sản mới nhất, theo dõi biến động và nhận thông báo khi giá thay đổi mạnh.\n\n## Tính năng chính\n- Dashboard giá theo khu vực\n- Biểu đồ xu hướng\n- Danh sách mặt hàng yêu thích\n- Thông báo giá",
    thumbnail_url: "",
    cover_url: "",
    demo_url: "",
    github_url: "",
    tech_stack: ["React", "Node.js", "Supabase"],
    status: "completed",
    is_featured: true,
    published: true,
    created_at: "2026-05-01T09:00:00.000Z",
    visual_kind: "farm"
  },
  {
    id: "local-portfolio",
    title: "Portfolio CV Supabase",
    slug: "portfolio-cv-supabase",
    description: "Portfolio cá nhân có CV, Projects, News và dữ liệu public từ Supabase.",
    content: "## Mục tiêu\nTạo một portfolio có cấu trúc rõ ràng, dễ cập nhật và đủ linh hoạt để mở rộng admin sau MVP.\n\n## Điểm nổi bật\n- Routing public đầy đủ\n- Render Markdown\n- Fallback UI khi thiếu ảnh\n- Admin chỉnh nội dung cục bộ",
    thumbnail_url: "",
    cover_url: "",
    demo_url: "",
    github_url: "",
    tech_stack: ["React", "Vite", "Supabase"],
    status: "in progress",
    is_featured: true,
    published: true,
    created_at: "2026-05-06T09:00:00.000Z",
    visual_kind: "portfolio"
  },
  {
    id: "local-news-room",
    title: "Dev News Room",
    slug: "dev-news-room",
    description: "Khu vực bài viết kỹ thuật, nhật ký phát triển và ghi chú triển khai sản phẩm.",
    content: "## Vai trò\nDùng làm nơi ghi lại kinh nghiệm kỹ thuật, quyết định thiết kế và các lần cải tiến sản phẩm.",
    thumbnail_url: "",
    cover_url: "",
    demo_url: "",
    github_url: "",
    tech_stack: ["React Markdown", "Content Design"],
    status: "published",
    is_featured: false,
    published: true,
    created_at: "2026-04-28T09:00:00.000Z",
    visual_kind: "markdown"
  }
];

const fallbackNews = [
  {
    id: "local-news-supabase",
    title: "Ngày đầu xây dựng portfolio với Supabase",
    slug: "ngay-dau-xay-dung-portfolio-voi-supabase",
    excerpt: "Ghi lại cách tổ chức CV, Project và News bằng Supabase cho MVP.",
    content: "## Ghi chú triển khai\nBắt đầu từ public routes, tách service layer và giữ UI có trạng thái loading, empty, error rõ ràng.\n\n## Ưu tiên\n- Đọc dữ liệu thật\n- Render detail bằng Markdown\n- Không đưa secret key vào frontend",
    thumbnail_url: "",
    cover_url: "",
    author: DEFAULT_SITE_TITLE,
    category: "Dev Log",
    tags: ["supabase", "react"],
    published: true,
    created_at: "2026-05-06T11:30:00.000Z",
    visual_kind: "supabase",
    cover_kind: "supabase-wide"
  },
  {
    id: "local-news-markdown",
    title: "Thiết kế nội dung Markdown dễ đọc",
    slug: "thiet-ke-noi-dung-markdown-de-doc",
    excerpt: "Một vài nguyên tắc để bài viết kỹ thuật nhìn rõ ràng trên mobile và desktop.",
    content: "## Nội dung cần thoáng\nHeading, paragraph, code block và link nên có khoảng cách đủ lớn để đọc lâu không mỏi.\n\n## Checklist\n- Giới hạn chiều rộng bài viết\n- Tăng line-height\n- Làm nổi bật link và code inline",
    thumbnail_url: "",
    cover_url: "",
    author: DEFAULT_SITE_TITLE,
    category: "Frontend",
    tags: ["markdown", "ui"],
    published: true,
    created_at: "2026-05-03T08:15:00.000Z",
    visual_kind: "markdown",
    cover_kind: "markdown-wide"
  }
];

const sampleCvPrintData = {
  profile: {
    ...fallbackProfile,
    full_name: "Trần Nguyễn Trung Nguyên",
    title: "Fullstack Developer Junior",
    bio: "Định hướng phát triển web và ứng dụng di động. Có 6 tháng thực hành tại edukidstaynguyen.com, đã làm quen quy trình xây dựng sản phẩm web/mobile, viết API, xử lý database và cải thiện giao diện người dùng.",
    avatar_url: cvReferenceAvatar,
    email: "tntnguyen.dev@gmail.com",
    phone: "0836-640-003",
    location: "Việt Nam",
    birth_date: "14-02-2003",
    website_url: "https://ngyen2k3-cv.vercel.app/"
  },
  skillEntries: [
    ["Kỹ năng chính", [
      { name: "React" },
      { name: "Flutter" },
      { name: "HTML/CSS" },
      { name: "Node.js" },
      { name: "Express.js" },
      { name: "REST API" },
      { name: "JWT" },
      { name: "MVC" },
      { name: "MongoDB" },
      { name: "Firebase" },
      { name: "Supabase" },
      { name: "Git" },
      { name: "Postman" },
      { name: "OpenWeatherMap API" },
      { name: "Firebase Cloud Messaging" },
      { name: "AI Tools" }
    ]]
  ],
  education: [
    {
      id: "sample-education-duy-tan",
      school: "Đại học Duy Tân",
      degree: "Cử nhân Kỹ thuật phần mềm",
      time: "2021 - 2025   |   Công nghệ phần mềm",
      description: "Đã học các môn cốt lõi: lập trình, cơ sở dữ liệu, phát triển web, thiết kế phần mềm, phân tích hệ thống và quản lý dự án."
    }
  ],
  experiences: [
    {
      organization: "edukidstaynguyen.com",
      company: "edukidstaynguyen.com",
      position: "6 tháng thực hành",
      time: "",
      description: "Làm quen quy trình phát triển sản phẩm, sửa lỗi, cải tiến giao diện và triển khai chức năng web/mobile. Thực hành xây dựng giao diện, viết API, xử lý dữ liệu và tích hợp các chức năng cơ bản."
    }
  ],
  projects: [
    {
      id: "sample-weather",
      title: "Weather",
      status: "Fullstack Developer Junior",
      created_at: "2026-03-01",
      description: "Ứng dụng quản lý công việc kết hợp dữ liệu thời tiết theo thời gian thực.\n• Xây dựng API todo và weather, xác thực JWT, cache dữ liệu và giao diện mobile Flutter.",
      tech_stack: ["Node.js", "Express.js", "MongoDB", "Flutter", "JWT", "OpenWeatherMap API"]
    },
    {
      id: "sample-mini-pos",
      title: "Mini POS",
      status: "Fullstack Developer Junior",
      created_at: "2026-04-01",
      description: "Ứng dụng POS cho nhà hàng/quầy ăn nhỏ, hỗ trợ tạo đơn nhanh và theo dõi doanh thu.\n• Phát triển API thực đơn, đơn hàng, lịch sử giao dịch và dashboard cơ bản.",
      tech_stack: ["Node.js", "Express.js", "MongoDB", "Flutter"]
    },
    {
      id: "sample-agri-price",
      title: "Giá Nông Sản",
      status: "Flutter / Fullstack Developer Junior",
      created_at: "2026-04-01",
      description: "Ứng dụng theo dõi giá cà phê, hồ tiêu, sầu riêng, vàng và xăng dầu theo thời gian thực.\n• Tích hợp dữ liệu giá, biểu đồ, tin tức, thời tiết và cảnh báo qua Firebase Cloud Messaging.",
      tech_stack: ["Flutter", "Node.js", "MongoDB", "Firebase Cloud Messaging"]
    },
    {
      id: "sample-marketplace",
      title: "Marketplace App & Website",
      status: "Fullstack Developer Junior",
      created_at: "2026-04-01",
      description: "Hệ thống marketplace gồm website, mobile app và trang quản trị admin cho mô hình thương mại điện tử.\n• Xây dựng các chức năng đăng nhập, sản phẩm, giỏ hàng, đặt hàng và quản lý người dùng.",
      tech_stack: ["React", "Flutter", "Node.js", "Express.js", "MongoDB", "Firebase"]
    }
  ],
  certificates: [],
  aiTools: "ChatGPT, Gemini, Grok, Ollama / Local AI. Chủ động dùng AI để hỗ trợ lập trình, kiểm thử ý tưởng, debug và tăng tốc phát triển tính năng.",
  goal: "Ứng tuyển vị trí Fullstack Developer Junior, tiếp tục phát triển kỹ năng full-stack trong dự án thực tế và đóng góp vào sản phẩm web/mobile có giá trị sử dụng."
};

const PortfolioContext = createContext(null);

function readStorage(key, fallbackValue) {
  if (typeof window === "undefined") return fallbackValue;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function usePersistentState(key, fallbackValue) {
  const [value, setValue] = useState(() => readStorage(key, fallbackValue));

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Unable to persist local draft", error);
    }
  }, [key, value]);

  return [value, setValue];
}

function hasDraftContent(content) {
  return Boolean(
    content &&
    CONTENT_FIELDS.some((key) => content[key] !== null && content[key] !== undefined)
  );
}
function mergeSavedContentWithBrowserDraft(savedContent = {}, browserDraft = {}) {
  return CONTENT_FIELDS.reduce((merged, key) => ({
    ...merged,
    [key]: savedContent[key] ?? browserDraft[key] ?? null
  }), {});
}

function needsBrowserDraftBackfill(savedContent = {}, browserDraft = {}) {
  return CONTENT_FIELDS.some((key) => (
    (savedContent[key] === null || savedContent[key] === undefined) &&
    browserDraft[key] !== null &&
    browserDraft[key] !== undefined
  ));
}

async function readFileBackedContent() {
  const response = await fetch(CONTENT_API_ENDPOINT, { cache: "no-store" });
  if (!response.ok) throw new Error(`Cannot load saved content (${response.status})`);
  return response.json();
}

async function writeFileBackedContent(content) {
  const response = await fetch(CONTENT_API_ENDPOINT, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(content)
  });

  if (!response.ok) throw new Error(`Cannot save content (${response.status})`);
  return response.json();
}

function PortfolioProvider({ children }) {
  const [session, setSession] = usePersistentState(STORAGE_KEYS.session, false);
  const [profileDraft, setProfileDraft] = usePersistentState(STORAGE_KEYS.profile, null);
  const [cvDraft, setCvDraft] = usePersistentState(STORAGE_KEYS.cv, null);
  const [projectsDraft, setProjectsDraft] = usePersistentState(STORAGE_KEYS.projects, null);
  const [newsDraft, setNewsDraft] = usePersistentState(STORAGE_KEYS.news, null);
  const [contactDraft, setContactDraft] = usePersistentState(STORAGE_KEYS.contact, null);
  const [theme, setTheme] = usePersistentState(STORAGE_KEYS.theme, "dark");
  const [syncState, setSyncState] = useState({ status: "idle", message: "Chưa đồng bộ" });

  const contentSnapshot = useMemo(() => ({
    profile: profileDraft,
    cv: cvDraft,
    projects: projectsDraft,
    news: newsDraft,
    contact: contactDraft
  }), [profileDraft, cvDraft, projectsDraft, newsDraft, contactDraft]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    const browserDraft = contentSnapshot;

    async function hydrateFileBackedContent() {
      try {
        setSyncState({ status: "loading", message: "Đang tải dữ liệu đã lưu..." });
        const savedContent = await readFileBackedContent();
        if (cancelled) return;

        const mergedContent = mergeSavedContentWithBrowserDraft(savedContent, browserDraft);

        if (hasDraftContent(mergedContent)) {
          setProfileDraft(mergedContent.profile ?? null);
          setCvDraft(mergedContent.cv ?? null);
          setProjectsDraft(mergedContent.projects ?? null);
          setNewsDraft(mergedContent.news ?? null);
          setContactDraft(mergedContent.contact ?? null);

          if (needsBrowserDraftBackfill(savedContent, browserDraft)) {
            await writeFileBackedContent(mergedContent);
            if (!cancelled) {
              setSyncState({ status: "saved", message: "Đã bổ sung dữ liệu trình duyệt vào kho lưu" });
            }
            return;
          }

          setSyncState({ status: "loaded", message: "Đã tải dữ liệu từ kho lưu" });
          return;
        }

        if (hasDraftContent(browserDraft)) {
          await writeFileBackedContent(browserDraft);
          if (!cancelled) {
            setSyncState({ status: "saved", message: "Đã chuyển dữ liệu trình duyệt sang kho lưu" });
          }
          return;
        }

        setSyncState({ status: "ready", message: "Sẵn sàng lưu dữ liệu" });
      } catch (error) {
        if (!cancelled) {
          setSyncState({
            status: "error",
            message: "Chưa đồng bộ được, đang dùng localStorage"
          });
          console.warn("File-backed content sync unavailable", error);
        }
      }
    }

    hydrateFileBackedContent();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistDrafts = useCallback((overrides = {}) => {
    const nextContent = { ...contentSnapshot, ...overrides };
    setSyncState({ status: "saving", message: "Đang lưu dữ liệu..." });

    return writeFileBackedContent(nextContent)
      .then(() => {
        setSyncState({ status: "saved", message: "Đã lưu dữ liệu vào kho lưu" });
        return true;
      })
      .catch((error) => {
        setSyncState({
          status: "error",
          message: "Lưu kho dữ liệu lỗi, dữ liệu vẫn còn trong localStorage"
        });
        console.warn("Unable to save file-backed content", error);
        return false;
      });
  }, [contentSnapshot]);

  const value = useMemo(() => ({
    isAdmin: Boolean(session),
    theme,
    syncState,
    profileDraft,
    cvDraft,
    projectsDraft,
    newsDraft,
    contactDraft,
    async login(password) {
      try {
        const response = await fetch("/api/admin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ password })
        });

        if (response.ok) {
          setSession(true);
          return true;
        }

        if (response.status === 401 || response.status === 403) return false;
      } catch (error) {
        console.warn("Admin login API unavailable, using local fallback", error);
      }

      const accepted = password === ADMIN_PASSWORD;
      if (accepted) setSession(true);
      return accepted;
    },
    logout() {
      fetch("/api/admin-logout", {
        method: "POST",
        credentials: "same-origin"
      }).catch(() => {});
      setSession(false);
    },
    toggleTheme() {
      setTheme((current) => current === "light" ? "dark" : "light");
    },
    saveProfile(nextProfile) {
      setProfileDraft(nextProfile);
      persistDrafts({ profile: nextProfile });
    },
    resetProfile() {
      setProfileDraft(null);
      persistDrafts({ profile: null });
    },
    saveCv(nextCv) {
      setCvDraft(nextCv);
      persistDrafts({ cv: nextCv });
    },
    resetCv() {
      setCvDraft(null);
      persistDrafts({ cv: null });
    },
    saveProjects(nextProjects) {
      setProjectsDraft(nextProjects);
      return persistDrafts({ projects: nextProjects });
    },
    resetProjects() {
      setProjectsDraft(null);
      persistDrafts({ projects: null });
    },
    saveNews(nextNews) {
      setNewsDraft(nextNews);
      persistDrafts({ news: nextNews });
    },
    resetNews() {
      setNewsDraft(null);
      persistDrafts({ news: null });
    },
    saveContact(nextContact) {
      setContactDraft(nextContact);
      persistDrafts({ contact: nextContact });
    },
    resetContact() {
      setContactDraft(null);
      persistDrafts({ contact: null });
    }
  }), [session, theme, syncState, profileDraft, cvDraft, projectsDraft, newsDraft, contactDraft, setSession, setTheme, setProfileDraft, setCvDraft, setProjectsDraft, setNewsDraft, setContactDraft, persistDrafts]);

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

function usePortfolioContent() {
  const value = useContext(PortfolioContext);
  if (!value) throw new Error("usePortfolioContent must be used inside PortfolioProvider");
  return value;
}

function useAsyncData(loader, deps = []) {
  const [state, setState] = useState({ status: "loading", data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, error: null });

    loader()
      .then((data) => {
        if (!cancelled) setState({ status: "success", data, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", data: null, error });
      });

    return () => {
      cancelled = true;
    };
  }, deps);

  return state;
}

function usePageTitle(title) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      requestAnimationFrame(() => {
        document.querySelector(location.hash)?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });
      return;
    }

    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  return null;
}

function coalesce(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function formatDate(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(dateString));
}

function formatOptionalDate(dateString) {
  if (!dateString) return "";
  const normalized = String(dateString).trim();
  if (!normalized) return "";
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return normalized;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatMonthYear(dateString) {
  if (!dateString) return "";
  const normalized = String(dateString).trim();
  if (!normalized) return "";
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return normalized;
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function formatPeriod(item) {
  if (item.time || item.period) return item.time || item.period;
  const start = item.start_date ? formatDate(item.start_date) : "";
  const end = item.is_current ? "Hiện tại" : item.end_date ? formatDate(item.end_date) : "";
  return [start, end].filter(Boolean).join(" - ");
}

function normalizeSkillGroup(value) {
  const raw = String(value || "Frontend").trim();
  const matched = DEFAULT_SKILL_GROUPS.find((group) => group.toLowerCase() === raw.toLowerCase());
  return matched ?? raw;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImageSource(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Cannot load image."));
    image.src = source;
  });
}

async function optimizeImageDataUrl(dataUrl, {
  maxWidth = 1800,
  maxHeight = 1000,
  maxBytes = 650_000,
  quality = 0.82
} = {}) {
  if (!String(dataUrl || "").startsWith("data:image/")) return dataUrl;
  if (dataUrl.length <= maxBytes * 1.34) return dataUrl;

  const image = await loadImageSource(dataUrl);
  let scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  let currentQuality = quality;
  let optimized = dataUrl;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    optimized = canvas.toDataURL("image/webp", currentQuality);

    if (optimized.length <= maxBytes * 1.34) return optimized;
    if (currentQuality > 0.58) {
      currentQuality -= 0.08;
    } else {
      scale *= 0.82;
    }
  }

  return optimized;
}

async function optimizeImageFile(file, options) {
  const dataUrl = await readFileAsDataUrl(file);
  return optimizeImageDataUrl(dataUrl, options);
}

const PROJECT_IMAGE_OPTIONS = {
  maxWidth: 1800,
  maxHeight: 1000,
  maxBytes: 650_000,
  quality: 0.82
};

async function optimizeProjectImages(project) {
  const [thumbnailUrl, coverUrl, appDemoImageUrl, webDemoImageUrl] = await Promise.all([
    optimizeImageDataUrl(project.thumbnail_url, PROJECT_IMAGE_OPTIONS),
    optimizeImageDataUrl(project.cover_url, PROJECT_IMAGE_OPTIONS),
    optimizeImageDataUrl(project.app_demo_image_url, PROJECT_IMAGE_OPTIONS),
    optimizeImageDataUrl(project.web_demo_image_url, PROJECT_IMAGE_OPTIONS)
  ]);

  return {
    ...project,
    thumbnail_url: thumbnailUrl,
    cover_url: coverUrl,
    app_demo_image_url: appDemoImageUrl,
    web_demo_image_url: webDemoImageUrl
  };
}

function fallbackKind(index, wide = false) {
  const kind = visualKinds[index % visualKinds.length];
  return wide ? `${kind}-wide` : kind;
}

function normalizeProfile(data) {
  return {
    ...fallbackProfile,
    ...(data ?? {}),
    greeting: coalesce(data?.greeting, fallbackProfile.greeting, "Xin chào, tôi là"),
    full_name: coalesce(data?.full_name, data?.fullName, fallbackProfile.full_name),
    contact_headline: coalesce(data?.contact_headline, data?.contactHeadline, fallbackProfile.contact_headline),
    contact_note: coalesce(data?.contact_note, data?.contactNote, fallbackProfile.contact_note),
    avatar_url: coalesce(data?.avatar_url, data?.avatarUrl, fallbackProfile.avatar_url),
    cv_url: coalesce(data?.cv_url, data?.cvUrl, ""),
    birth_date: coalesce(data?.birth_date, data?.birthDate, data?.date_of_birth, data?.dateOfBirth, fallbackProfile.birth_date),
    website_url: coalesce(data?.website_url, data?.websiteUrl, data?.site_url, data?.siteUrl, fallbackProfile.website_url),
    avatar_file_name: coalesce(data?.avatar_file_name, data?.avatarFileName, ""),
    cv_file_name: coalesce(data?.cv_file_name, data?.cvFileName, ""),
    github_url: coalesce(data?.github_url, data?.githubUrl, fallbackProfile.github_url),
    linkedin_url: coalesce(data?.linkedin_url, data?.linkedinUrl, fallbackProfile.linkedin_url),
    facebook_url: coalesce(data?.facebook_url, data?.facebookUrl, fallbackProfile.facebook_url),
    instagram_url: coalesce(data?.instagram_url, data?.instagramUrl, fallbackProfile.instagram_url)
  };
}

function normalizeProject(project, index = 0) {
  return {
    ...project,
    id: coalesce(project.id, project.slug, `project-${index}`),
    title: coalesce(project.title, "Untitled Project"),
    slug: coalesce(project.slug, ""),
    description: coalesce(project.description, project.excerpt, ""),
    thumbnail_url: coalesce(project.thumbnail_url, project.thumbnailUrl, project.cover_url),
    cover_url: coalesce(project.cover_url, project.coverUrl, project.thumbnail_url),
    app_demo_image_url: coalesce(project.app_demo_image_url, project.appDemoImageUrl, project.app_image_url, project.appImageUrl, ""),
    web_demo_image_url: coalesce(project.web_demo_image_url, project.webDemoImageUrl, project.web_image_url, project.webImageUrl, ""),
    app_demo_file_name: coalesce(project.app_demo_file_name, project.appDemoFileName, ""),
    web_demo_file_name: coalesce(project.web_demo_file_name, project.webDemoFileName, ""),
    tech_stack: asArray(coalesce(project.tech_stack, project.techStack)),
    status: coalesce(project.status, "Published"),
    demo_url: coalesce(project.demo_url, project.demoUrl),
    github_url: coalesce(project.github_url, project.githubUrl),
    content: coalesce(project.content, project.details, project.description, ""),
    is_featured: Boolean(project.is_featured),
    published: project.published !== false,
    visual_kind: coalesce(project.thumbnail_kind, project.visual_kind, fallbackKind(index))
  };
}

function normalizeNews(post, index = 0) {
  return {
    ...post,
    title: coalesce(post.title, "Untitled Article"),
    slug: coalesce(post.slug, ""),
    excerpt: coalesce(post.excerpt, post.description, ""),
    thumbnail_url: coalesce(post.thumbnail_url, post.thumbnailUrl, post.cover_url),
    cover_url: coalesce(post.cover_url, post.coverUrl, post.thumbnail_url),
    author: coalesce(post.author, fallbackProfile.full_name, DEFAULT_SITE_TITLE),
    category: coalesce(post.category, "Dev Log"),
    tags: asArray(post.tags),
    created_at: coalesce(post.created_at, post.createdAt),
    content: coalesce(post.content, post.body, post.excerpt, ""),
    visual_kind: coalesce(post.thumbnail_kind, post.visual_kind, fallbackKind(index + 6)),
    cover_kind: coalesce(post.cover_kind, `${fallbackKind(index + 6)}-wide`)
  };
}

function getEffectiveProfile(content, remoteProfile) {
  return normalizeProfile({
    ...(remoteProfile ?? {}),
    ...(content.profileDraft ?? {}),
    ...(content.contactDraft ?? {})
  });
}

function sortByCreatedDesc(items) {
  return [...items].sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0));
}

function groupSkills(data) {
  return data.reduce((groups, item) => {
    const group = normalizeSkillGroup(coalesce(item.group_name, item.group, item.category, item.type, "Frontend"));
    const skill = {
      name: coalesce(item.name, item.title, "Skill")
    };
    return { ...groups, [group]: [...(groups[group] ?? []), skill] };
  }, {});
}

function orderedSkillEntries(groups) {
  return Object.entries(groups).sort(([groupA], [groupB]) => {
    const indexA = skillGroupOrder.indexOf(groupA);
    const indexB = skillGroupOrder.indexOf(groupB);
    if (indexA === -1 && indexB === -1) return groupA.localeCompare(groupB);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
}

function normalizeExperience(item) {
  const organization = coalesce(item.organization, item.company, item.project, item.company_name, "");
  return {
    organization,
    company: organization,
    position: coalesce(item.position, item.title, ""),
    time: formatPeriod(item),
    description: coalesce(item.description, item.summary, "")
  };
}

function normalizeEducationItem(item, index = 0) {
  return {
    id: coalesce(item.id, `education-${index}`),
    school: coalesce(item.school, item.institution, ""),
    degree: coalesce(item.degree, item.title, ""),
    time: coalesce(item.time, item.period, formatPeriod(item)),
    description: coalesce(item.description, item.summary, "")
  };
}

function normalizeCertificateItem(item, index = 0) {
  if (typeof item === "string") {
    return {
      id: `certificate-${index}`,
      title: item,
      issuer: "",
      time: "",
      credential_url: ""
    };
  }

  return {
    id: coalesce(item.id, `certificate-${index}`),
    title: coalesce(item.title, item.name, ""),
    issuer: coalesce(item.issuer, item.organization, ""),
    time: coalesce(item.time, item.date, item.period, ""),
    credential_url: coalesce(item.credential_url, item.credentialUrl, item.url, "")
  };
}

function selectArrayState(remoteState, overrideData, fallbackData = []) {
  if (Array.isArray(overrideData)) {
    return { status: "success", data: overrideData, error: null };
  }
  if (remoteState.status === "success") {
    return { status: "success", data: remoteState.data ?? [], error: null };
  }
  if (remoteState.status === "error") {
    return { status: "success", data: fallbackData, error: null };
  }
  return remoteState;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toEditableProfile(profile) {
  return {
    greeting: profile.greeting ?? "Xin chào, tôi là",
    full_name: profile.full_name ?? "",
    title: profile.title ?? "",
    bio: profile.bio ?? "",
    contact_headline: profile.contact_headline ?? "",
    contact_note: profile.contact_note ?? "",
    avatar_url: profile.avatar_url ?? "",
    cv_url: profile.cv_url ?? "",
    birth_date: profile.birth_date ?? "",
    website_url: profile.website_url ?? "",
    avatar_file_name: profile.avatar_file_name ?? "",
    cv_file_name: profile.cv_file_name ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    location: profile.location ?? "",
    github_url: profile.github_url ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    facebook_url: profile.facebook_url ?? "",
    instagram_url: profile.instagram_url ?? ""
  };
}

function toEditableContact(profile) {
  return {
    contact_headline: profile.contact_headline ?? "",
    contact_note: profile.contact_note ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    location: profile.location ?? "",
    github_url: profile.github_url ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    facebook_url: profile.facebook_url ?? "",
    instagram_url: profile.instagram_url ?? ""
  };
}

function toEditableProject(project, index = 0) {
  const item = normalizeProject(project, index);
  return {
    ...item,
    tech_stack_text: item.tech_stack.join(", ")
  };
}

function fromEditableProject(project) {
  const techStack = asArray(project.tech_stack_text);
  return {
    ...project,
    slug: project.slug || slugify(project.title),
    tech_stack: techStack,
    is_featured: Boolean(project.is_featured),
    published: Boolean(project.published)
  };
}

function toEditableNews(post, index = 0) {
  const item = normalizeNews(post, index);
  return {
    ...item,
    tags_text: item.tags.join(", ")
  };
}

function fromEditableNews(post) {
  return {
    ...post,
    slug: post.slug || slugify(post.title),
    tags: asArray(post.tags_text),
    published: Boolean(post.published),
    created_at: post.created_at || new Date().toISOString()
  };
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { isAdmin, theme, toggleTheme } = usePortfolioContent();
  const items = [
    { label: "Home", to: "/" },
    { label: "CV", to: "/cv" },
    { label: "Projects", to: "/projects" },
    { label: "News", to: "/news" },
    { label: "Contact", to: "/#contact" }
  ];

  function isActive(to) {
    if (to === "/#contact") return location.hash === "#contact";
    if (to === "/") return location.pathname === "/" && location.hash !== "#contact";
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  }

  return (
    <header className={`site-header ${open ? "is-open" : ""}`}>
      <div className="nav-shell">
        <button
          className="nav-toggle"
          type="button"
          aria-label="Mở menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span></span><span></span><span></span>
        </button>
        <nav className="site-nav" aria-label="Điều hướng chính">
          {items.map((item) => (
            <Link
              key={item.to}
              className={isActive(item.to) ? "active" : ""}
              to={item.to}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <button
            className="theme-toggle"
            type="button"
            aria-label={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
            onClick={toggleTheme}
          >
            <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
            <b>{theme === "dark" ? "Sáng" : "Tối"}</b>
          </button>
          <Link className="nav-cta" to="/admin" onClick={() => setOpen(false)}>
            {isAdmin ? "Admin Studio" : "Admin"}
          </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const content = usePortfolioContent();
  const profileState = useAsyncData(getProfile, []);
  const profile = getEffectiveProfile(content, profileState.data);

  return (
    <footer className="site-footer">
      <div className="footer-shell">
        <div>
          <p>{profile.email}</p>
        </div>
        <div className="footer-links" aria-label="Liên kết xã hội">
          <SocialIconLink href={profile.github_url} type="github" label="GitHub" />
          <SocialIconLink href={profile.linkedin_url} type="linkedin" label="LinkedIn" />
          <SocialIconLink href={profile.instagram_url} type="instagram" label="Instagram" />
          <SocialIconLink href={profile.facebook_url} type="facebook" label="Facebook" />
        </div>
        <p className="copyright">© 2026. All rights reserved.</p>
      </div>
    </footer>
  );
}

function ButtonLink({ href, label, variant = "primary", external = false }) {
  if (external) {
    return <a className={`button ${variant}`} href={href} target="_blank" rel="noreferrer">{label}</a>;
  }

  return <Link className={`button ${variant}`} to={href}>{label}</Link>;
}

function CvDownloadButton({ href, fileName = "CV.pdf" }) {
  if (!href) return null;
  const isDataFile = String(href).startsWith("data:");
  const resolvedFileName = fileName || "CV.pdf";

  return (
    <a
      className="button cv-download-button"
      href={href}
      target={isDataFile ? undefined : "_blank"}
      rel={isDataFile ? undefined : "noreferrer"}
      download={isDataFile ? resolvedFileName : undefined}
    >
      Download CV
    </a>
  );
}

function splitProfileName(fullName) {
  const normalizedName = String(fullName || "").trim().replace(/\s+/g, " ");
  if (!normalizedName) {
    return {
      isSplit: false,
      lines: [DEFAULT_SITE_TITLE]
    };
  }

  const nameParts = normalizedName.split(" ");
  if (normalizedName.length <= 18 || nameParts.length <= 2) {
    return {
      isSplit: false,
      lines: [normalizedName]
    };
  }

  return {
    isSplit: true,
    lines: [
      nameParts.slice(0, -1).join(" "),
      nameParts.at(-1)
    ]
  };
}

function SocialIcon({ type }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  };

  if (type === "github") {
    return (
      <svg {...common}>
        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5a10.4 10.4 0 0 0-6 0C8 2 7 2 7 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 6 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
        <path d="M9 18c-4.5 2-5-2-7-2" />
      </svg>
    );
  }

  if (type === "linkedin") {
    return (
      <svg {...common}>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect width="4" height="12" x="2" y="9" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    );
  }

  if (type === "instagram") {
    return (
      <svg {...common}>
        <rect width="18" height="18" x="3" y="3" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17.5 6.5h.01" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function SocialIconLink({ href, type, label }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}>
      <SocialIcon type={type} />
      <span className="sr-only">{label}</span>
    </a>
  );
}

function SectionTitle({ kicker, title, description }) {
  return (
    <div className="section-title">
      {kicker ? <p className="kicker">{kicker}</p> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

function Badge({ children, tone = "" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function VisualMock({ kind = "portfolio", size = "card" }) {
  const baseKind = kind.replace("-wide", "");
  const labels = {
    farm: "Agri price dashboard",
    portfolio: "Portfolio UI",
    analytics: "Analytics dashboard",
    mobile: "Mobile task app",
    calendar: "Content calendar",
    finance: "Finance tracker",
    code: "Code editor",
    server: "Server room",
    career: "Career notes",
    supabase: "Supabase article",
    markdown: "Markdown page",
    storage: "Storage bucket"
  };

  return (
    <div className={`visual visual-${kind} visual-${size}`} role="img" aria-label={labels[baseKind] ?? "Project visual"}>
      <div className="visual-grid" aria-hidden="true"></div>
      <div className="visual-window" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <div className="visual-content" aria-hidden="true">
        <i></i><i></i><i></i><i></i>
      </div>
      <div className="visual-device" aria-hidden="true">
        <b></b><b></b><b></b>
      </div>
    </div>
  );
}

function ImageWithFallback({ src, alt, kind, size = "card", className = "" }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      <img
        className={`data-image data-image-${size} ${className}`}
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return <VisualMock kind={kind} size={size} />;
}

function AvatarImage({ src, alt }) {
  const [failed, setFailed] = useState(false);
  const avatarSrc = src && !failed ? src : fallbackProfile.avatar_url;

  return <img src={avatarSrc} alt={alt} onError={() => setFailed(true)} />;
}

function LoadingState({ label = "Đang tải dữ liệu..." }) {
  return (
    <div className="state-grid" aria-live="polite">
      {Array.from({ length: 3 }).map((_, index) => (
        <article className="skeleton-card" key={index}>
          <span></span><strong></strong><p></p><p></p>
        </article>
      ))}
      <p className="state-note">{label}</p>
    </div>
  );
}

function EmptyState({ title = "Chưa có dữ liệu", message }) {
  return (
    <div className="state-panel">
      <span className="state-icon" aria-hidden="true">∅</span>
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}

function ErrorState({ message = "Không thể tải dữ liệu. Vui lòng thử lại sau." }) {
  return (
    <div className="state-panel error">
      <span className="state-icon" aria-hidden="true">!</span>
      <h2>Có lỗi xảy ra</h2>
      <p>{message}</p>
    </div>
  );
}

function CollectionState({ state, emptyMessage, children }) {
  if (state.status === "loading") return <LoadingState />;
  if (state.status === "error") return <ErrorState />;
  if (!state.data || state.data.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }
  return children(state.data);
}

function ProjectCard({ project, index = 0 }) {
  const item = normalizeProject(project, index);

  return (
    <article className="project-card">
      <Link className="card-media" to={`/projects/${item.slug}`} aria-label={`Xem ${item.title}`}>
        <ImageWithFallback src={item.thumbnail_url} alt={item.title} kind={item.visual_kind} />
      </Link>
      <div className="card-body">
        <div className="card-heading">
          <h3>{item.title}</h3>
          <span className="status-chip">{item.status}</span>
        </div>
        <p>{item.description}</p>
        <div className="badge-row">
          {item.tech_stack.map((tech) => <Badge key={tech}>{tech}</Badge>)}
        </div>
      </div>
      <div className="card-actions">
        <Link to={`/projects/${item.slug}`}>Xem chi tiết</Link>
      </div>
    </article>
  );
}

function NewsCard({ post, index = 0 }) {
  const item = normalizeNews(post, index);

  return (
    <article className="news-card">
      <Link className="card-media" to={`/news/${item.slug}`} aria-label={`Đọc ${item.title}`}>
        <ImageWithFallback src={item.thumbnail_url} alt={item.title} kind={item.visual_kind} />
      </Link>
      <div className="card-body">
        <div className="meta-line">
          <Badge tone="category">{item.category}</Badge>
          <time dateTime={item.created_at}>{formatDate(item.created_at)}</time>
        </div>
        <h3>{item.title}</h3>
        <p>{item.excerpt}</p>
        <div className="tag-row">
          {item.tags.map((tag) => <span key={tag}>#{tag}</span>)}
        </div>
      </div>
      <div className="card-actions">
        <Link to={`/news/${item.slug}`}>Đọc tiếp</Link>
      </div>
    </article>
  );
}

function ContactSection({ profile }) {
  return (
    <section className="contact-band" id="contact">
      <div className="container contact-layout">
        <div>
          <p className="kicker">Contact</p>
          <h2>{profile.contact_headline}</h2>
          <p>{profile.contact_note}</p>
        </div>
        <div className="contact-card">
          {profile.email ? <a href={`mailto:${profile.email}`}><span>Email</span>{profile.email}</a> : null}
          {profile.phone ? <a href={`tel:${profile.phone.replaceAll(" ", "")}`}><span>Phone</span>{profile.phone}</a> : null}
          {profile.location ? <p><span>Location</span>{profile.location}</p> : null}
          <div className="contact-socials">
            <SocialIconLink href={profile.github_url} type="github" label="GitHub" />
            <SocialIconLink href={profile.linkedin_url} type="linkedin" label="LinkedIn" />
            <SocialIconLink href={profile.instagram_url} type="instagram" label="Instagram" />
            <SocialIconLink href={profile.facebook_url} type="facebook" label="Facebook" />
          </div>
        </div>
      </div>

    </section>
  );
}

function HomePage() {
  usePageTitle(DEFAULT_SITE_TITLE);
  const content = usePortfolioContent();
  const profileState = useAsyncData(getProfile, []);
  const featuredState = useAsyncData(getFeaturedProjects, []);
  const latestState = useAsyncData(getLatestNews, []);
  const profile = getEffectiveProfile(content, profileState.data);
  const localFeatured = Array.isArray(content.projectsDraft)
    ? content.projectsDraft.filter((item) => item.published !== false && item.is_featured).slice(0, 3)
    : null;
  const localLatest = Array.isArray(content.newsDraft)
    ? sortByCreatedDesc(content.newsDraft.filter((item) => item.published !== false)).slice(0, 3)
    : null;
  const effectiveFeatured = selectArrayState(
    featuredState,
    localFeatured,
    fallbackProjects.filter((item) => item.published && item.is_featured).slice(0, 3)
  );
  const effectiveLatest = selectArrayState(latestState, localLatest, fallbackNews.slice(0, 3));

  return (
    <main>
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy reveal">
            <p className="kicker">Portfolio Studio / Supabase Ready</p>
            <h1>{profile.greeting} <span>{profile.full_name}</span></h1>
            <p className="hero-title">{profile.title}</p>
            <p className="hero-description">{profile.bio}</p>
            <div className="hero-actions">
              <ButtonLink href="/cv" label="Xem CV" />
              <ButtonLink href="/projects" label="Xem Projects" variant="secondary" />
              <ButtonLink href="/admin" label="Admin" variant="ghost" />
            </div>
          </div>
          <div className="hero-portrait reveal delay-1">
            <div className="portrait-ring">
              <AvatarImage src={profile.avatar_url} alt={`Avatar ${profile.full_name}`} />
            </div>
            <div className="hero-stat stat-a">
              <strong>Admin</strong>
              <span>edit content</span>
            </div>
            <div className="hero-stat stat-b">
              <strong>Supabase</strong>
              <span>public data</span>
            </div>
          </div>
        </div>
      </section>

      <section className="content-band">
        <div className="container">
          <SectionTitle
            kicker="Selected work"
            title="Featured Projects"
            description="Các project nổi bật được trình bày rõ thông tin, dễ đọc và có thể chỉnh nhanh từ Admin Studio."
          />
          <CollectionState state={effectiveFeatured} emptyMessage="Chưa có project nào.">
            {(items) => (
              <div className="card-grid three">
                {items.map((project, index) => <ProjectCard key={project.id ?? project.slug} project={project} index={index} />)}
              </div>
            )}
          </CollectionState>
        </div>
      </section>

      <section className="content-band compact">
        <div className="container">
          <SectionTitle
            kicker="Writing"
            title="Latest News"
            description="Ghi chú phát triển, bài viết kỹ thuật và nhật ký làm sản phẩm."
          />
          <CollectionState state={effectiveLatest} emptyMessage="Chưa có bài viết nào.">
            {(items) => (
              <div className="card-grid three">
                {items.map((post, index) => <NewsCard key={post.id ?? post.slug} post={post} index={index} />)}
              </div>
            )}
          </CollectionState>
        </div>
      </section>

      <ContactSection profile={profile} />
    </main>
  );
}

function CvSectionIcon({ type }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  };

  if (type === "skills") {
    return <svg {...common}><path d="m8 9-3 3 3 3" /><path d="m16 9 3 3-3 3" /><path d="m14 5-4 14" /></svg>;
  }

  if (type === "education") {
    return <svg {...common}><path d="m3 10 9-5 9 5-9 5z" /><path d="M7 12.2V16c2.7 2 7.3 2 10 0v-3.8" /><path d="M21 10v6" /></svg>;
  }

  if (type === "certificates") {
    return <svg {...common}><path d="M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" /><path d="m9 14-1 7 4-2 4 2-1-7" /><path d="m9.5 9 1.6 1.6 3.4-3.4" /></svg>;
  }

  if (type === "email") {
    return <svg {...common}><rect width="18" height="14" x="3" y="5" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
  }

  if (type === "phone") {
    return <svg {...common}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z" /></svg>;
  }

  if (type === "location") {
    return <svg {...common}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2" /></svg>;
  }

  if (type === "birth") {
    return <svg {...common}><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /></svg>;
  }

  if (type === "website") {
    return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15 15 0 0 1 0 20" /><path d="M12 2a15 15 0 0 0 0 20" /></svg>;
  }

  return <svg {...common}><rect width="18" height="15" x="3" y="5" rx="2" /><path d="M8 5V3h8v2" /><path d="M3 10h18" /></svg>;
}

function CvSectionHeading({ icon, children }) {
  return (
    <div className="cv-section-heading">
      <CvSectionIcon type={icon} />
      <h2>{children}</h2>
    </div>
  );
}

function CvContactItem({ type, href, children }) {
  if (!children) return null;

  const content = (
    <>
      <CvSectionIcon type={type} />
      <span>{children}</span>
    </>
  );

  if (!href) return <span className="cv-meta-item">{content}</span>;
  return <a className="cv-meta-item" href={href}>{content}</a>;
}

function CvProfileHero({ profile, onExportPdf }) {
  return (
    <section className="cv-profile-hero">
      <div className="cv-avatar-frame">
        <AvatarImage src={profile.avatar_url} alt={`Avatar ${profile.full_name}`} />
      </div>

      <div className="cv-profile-copy">
        <div className="cv-profile-intro">
          <div>
            <h1 className="cv-profile-name">{profile.full_name || DEFAULT_SITE_TITLE}</h1>
            {profile.title ? <p className="cv-profile-role">{profile.title}</p> : null}
          </div>

          <div className="cv-hero-actions no-print">
            <CvDownloadButton href={profile.cv_url} fileName={profile.cv_file_name} />
            <button className="button secondary cv-print-button" type="button" onClick={onExportPdf}>
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M7 3h10v5H7z" />
                <path d="M6 17H5a3 3 0 0 1-3-3v-3a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-1" />
                <path d="M7 14h10v7H7z" />
              </svg>
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {profile.bio ? <p className="cv-profile-bio multiline-text">{profile.bio}</p> : null}

        <div className="cv-profile-footer">
          <div className="cv-profile-meta">
            <CvContactItem type="email" href={profile.email ? `mailto:${profile.email}` : ""}>{profile.email}</CvContactItem>
            <CvContactItem type="phone" href={profile.phone ? `tel:${profile.phone.replaceAll(" ", "")}` : ""}>{profile.phone}</CvContactItem>
            <CvContactItem type="birth">{profile.birth_date ? `Ngày sinh: ${formatOptionalDate(profile.birth_date)}` : ""}</CvContactItem>
            <CvContactItem type="location">{profile.location}</CvContactItem>
            <CvContactItem type="website" href={profile.website_url}>{profile.website_url}</CvContactItem>
          </div>

          <div className="cv-social-icons" aria-label="Social links">
            <SocialIconLink href={profile.github_url} type="github" label="GitHub" />
            <SocialIconLink href={profile.linkedin_url} type="linkedin" label="LinkedIn" />
            <SocialIconLink href={profile.instagram_url} type="instagram" label="Instagram" />
            <SocialIconLink href={profile.facebook_url} type="facebook" label="Facebook" />
          </div>
        </div>
      </div>
    </section>
  );
}

function CvSkillsSection({ status, skillEntries }) {
  if (status === "loading") {
    return <section className="cv-premium-panel"><CvSectionHeading icon="skills">Skills</CvSectionHeading><LoadingState /></section>;
  }

  if (!skillEntries.length) return null;

  return (
    <section className="cv-premium-panel cv-skills-panel">
      <CvSectionHeading icon="skills">Skills</CvSectionHeading>
      <div className="cv-skill-groups">
        {skillEntries.map(([group, groupSkills]) => (
          <div className="cv-skill-group" key={group}>
            <h3>{group}</h3>
            <div className="cv-skill-pills">
              {groupSkills.map((skill) => <span key={`${group}-${skill.name}`}>{skill.name}</span>)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CvEducationSection({ education }) {
  if (!education.length) return null;

  return (
    <section className="cv-premium-panel">
      <CvSectionHeading icon="education">Education</CvSectionHeading>
      <div className="cv-support-timeline">
        {education.map((item) => (
          <article key={item.id}>
            <h3>{item.degree}</h3>
            {item.school ? <strong>{item.school}</strong> : null}
            {item.time ? <time>{item.time}</time> : null}
            {item.description ? <p className="multiline-text">{item.description}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function CvCertificatesSection({ certificates }) {
  if (!certificates.length) return null;

  return (
    <section className="cv-premium-panel">
      <CvSectionHeading icon="certificates">Certificates</CvSectionHeading>
      <ul className="cv-certificate-list">
        {certificates.map((item) => (
          <li key={item.id}>
            {item.credential_url ? <a href={item.credential_url} target="_blank" rel="noreferrer">{item.title}</a> : <strong>{item.title}</strong>}
            {item.issuer || item.time ? <span>{[item.issuer, item.time].filter(Boolean).join(" - ")}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CvExperienceSection({ status, experiences }) {
  if (status === "loading") {
    return <section className="cv-premium-panel cv-experience-panel"><CvSectionHeading icon="experience">Experience</CvSectionHeading><LoadingState /></section>;
  }

  if (!experiences.length) return null;

  return (
    <section className="cv-premium-panel cv-experience-panel">
      <CvSectionHeading icon="experience">Experience</CvSectionHeading>
      <div className="cv-experience-timeline">
        {experiences.map((item, index) => (
          <article className="cv-experience-item" key={`${item.organization}-${index}`}>
            <div className="cv-experience-heading">
              <div>
                <h3>{item.position}</h3>
                {item.organization ? <strong>{item.organization}</strong> : null}
              </div>
              {item.time ? <time>{item.time}</time> : null}
            </div>
            {item.description ? <p className="multiline-text">{item.description}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function CvPrintSection({ label, children, className = "" }) {
  if (!children) return null;
  return (
    <section className={`cv-print-section ${className}`.trim()}>
      <h2>{label}</h2>
      <div>{children}</div>
    </section>
  );
}

function CvPrintHeader({ profile }) {
  const leftContactItems = [
    profile.phone,
    profile.email,
    profile.location
  ].filter(Boolean);
  const rightContactItems = [
    profile.birth_date ? `Ngày sinh: ${formatOptionalDate(profile.birth_date)}` : "",
    profile.website_url
  ].filter(Boolean);

  return (
    <header className="cv-print-header">
      <AvatarImage src={profile.avatar_url} alt={`Avatar ${profile.full_name}`} />
      <div className="cv-print-header-copy">
        <h1>{profile.full_name || DEFAULT_SITE_TITLE}</h1>
        {profile.title ? <p>{profile.title}</p> : null}
        <div className="cv-print-contact-grid">
          <div>
            {leftContactItems.map((item) => <span key={item}>{item}</span>)}
          </div>
          <div>
            {rightContactItems.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
      </div>
    </header>
  );
}

function CvPrintSkillsTable({ skillEntries }) {
  const skills = skillEntries.flatMap(([group, groupSkills]) =>
    groupSkills.map((skill) => ({ group, name: skill.name }))
  );

  if (!skills.length) return null;

  const rows = [];
  for (let index = 0; index < skills.length; index += 4) {
    rows.push(skills.slice(index, index + 4));
  }

  return (
    <div className="cv-print-skill-block">
      <h3>Kỹ năng chính</h3>
      <div className="cv-print-skills">
        {rows.map((row, rowIndex) => (
          <div className="cv-print-skill-row" key={`skill-row-${rowIndex}`}>
            {row.map((skill) => <span key={`${skill.group}-${skill.name}`}>{skill.name}</span>)}
          </div>
        ))}
      </div>
    </div>
  );
}

function CvPrintTextSection({ text }) {
  if (!text) return null;
  return <p className="multiline-text">{text}</p>;
}

function CvPrintDocument({ profile, skillEntries, education, certificates, experiences, projects, aiTools = "", goal = "" }) {
  const [primaryProject, ...remainingProjects] = projects;

  return (
    <article className="cv-print-document" aria-label="Printable CV">
      <CvPrintHeader profile={profile} />
      <div className="cv-print-body">
        {profile.bio ? (
          <CvPrintSection label="Giới thiệu">
          {profile.bio ? <p className="multiline-text">{profile.bio}</p> : null}
          </CvPrintSection>
        ) : null}
        {education.length ? (
          <CvPrintSection label="Học vấn">
            <CvPrintEducation education={education} />
          </CvPrintSection>
        ) : null}
        {skillEntries.length ? (
          <CvPrintSection label="Kỹ năng">
            <CvPrintSkillsTable skillEntries={skillEntries} />
          </CvPrintSection>
        ) : null}
        {experiences.length ? (
          <CvPrintSection label="Kinh nghiệm">
            <CvPrintExperiences experiences={experiences} />
          </CvPrintSection>
        ) : null}
        {projects.length ? (
          <CvPrintSection label="Dự án tiêu biểu" className="cv-print-project-section">
            <CvPrintProjects projects={primaryProject ? [primaryProject] : []} />
          </CvPrintSection>
        ) : null}
        {remainingProjects.length ? (
          <CvPrintSection label="Dự án tiêu biểu" className="cv-print-project-section cv-print-page-break-before">
            <CvPrintProjects projects={remainingProjects} />
          </CvPrintSection>
        ) : null}
        {certificates.length ? (
          <CvPrintSection label="Chứng chỉ">
            <CvPrintCertificates certificates={certificates} />
          </CvPrintSection>
        ) : null}
        {aiTools ? (
          <CvPrintSection label="Công cụ AI">
            <CvPrintTextSection text={aiTools} />
          </CvPrintSection>
        ) : null}
        {goal ? (
          <CvPrintSection label="Mục tiêu">
            <CvPrintTextSection text={goal} />
          </CvPrintSection>
        ) : null}
      </div>
    </article>
  );
}

function CvPrintEducation({ education }) {
  if (!education.length) return null;
  return (
    <div className="cv-print-stack">
      {education.map((item) => (
        <article className="cv-print-entry" key={item.id}>
          <div className="cv-print-entry-head">
            <h3>{[item.degree, item.school].filter(Boolean).join(" - ")}</h3>
            {item.time ? <time>{item.time}</time> : null}
          </div>
          {item.description ? <p className="multiline-text">{item.description}</p> : null}
        </article>
      ))}
    </div>
  );
}

function CvPrintExperiences({ experiences }) {
  if (!experiences.length) return null;
  return (
    <div className="cv-print-stack">
      {experiences.map((item, index) => (
        <article className="cv-print-entry" key={`${item.organization}-${index}`}>
          <div className="cv-print-entry-head">
            <h3>{[item.position, item.organization].filter(Boolean).join(" - ")}</h3>
            {item.time ? <time>{item.time}</time> : null}
          </div>
          {item.description ? <p className="multiline-text">{item.description}</p> : null}
        </article>
      ))}
    </div>
  );
}

function CvPrintProjects({ projects }) {
  if (!projects.length) return null;
  return (
    <div className="cv-print-projects">
      {projects.map((project) => (
        <article className="cv-print-project" key={project.id ?? project.slug}>
          <div className="cv-print-project-head">
            <div>
              <h3>{project.title}</h3>
              {project.status ? <em>{project.status}</em> : null}
            </div>
            {project.created_at ? <time>{formatMonthYear(project.created_at)}</time> : null}
          </div>
          {project.description ? <p className="multiline-text">{project.description}</p> : null}
          {project.tech_stack.length ? <p className="cv-print-tech">Công nghệ: {project.tech_stack.join(", ")}</p> : null}
        </article>
      ))}
    </div>
  );
}

function CvPrintCertificates({ certificates }) {
  if (!certificates.length) return null;
  return (
    <div className="cv-print-stack">
      {certificates.map((item) => (
        <article className="cv-print-entry" key={item.id}>
          <div className="cv-print-entry-head">
            <h3>{item.title}</h3>
            {item.time ? <time>{item.time}</time> : null}
          </div>
          {item.issuer ? <p>{item.issuer}</p> : null}
        </article>
      ))}
    </div>
  );
}

function CVPage() {
  usePageTitle("CV");
  const content = usePortfolioContent();
  const profileState = useAsyncData(getProfile, []);
  const skillsState = useAsyncData(getSkills, []);
  const experiencesState = useAsyncData(getExperiences, []);
  const profile = getEffectiveProfile(content, profileState.data);
  const effectiveSkills = selectArrayState(skillsState, content.cvDraft?.skills, fallbackSkills);
  const effectiveExperiences = selectArrayState(experiencesState, content.cvDraft?.experiences, fallbackExperiences);
  const education = useMemo(
    () => (content.cvDraft?.education ?? fallbackEducation).map(normalizeEducationItem),
    [content.cvDraft?.education]
  );
  const certificates = useMemo(
    () => (content.cvDraft?.certificates ?? fallbackCertificates).map(normalizeCertificateItem),
    [content.cvDraft?.certificates]
  );
  const skillGroups = useMemo(() => groupSkills(effectiveSkills.data ?? []), [effectiveSkills.data]);
  const skillEntries = useMemo(() => orderedSkillEntries(skillGroups), [skillGroups]);
  const experiences = useMemo(
    () => (effectiveExperiences.data ?? []).map(normalizeExperience),
    [effectiveExperiences.data]
  );
  function handleExportPdf() {
    const previousTitle = document.title;
    const fileBaseName = profile.full_name ? `${profile.full_name} CV` : "CV";
    document.title = fileBaseName;
    window.print();
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 500);
  }

  return (
    <main className="page-shell">
      <div className="container">
        <div className="cv-layout">
          <aside className="profile-sidebar">
            <AvatarImage src={profile.avatar_url} alt={`Avatar ${profile.full_name}`} />
            <div className={`profile-name-card ${profileName.isSplit ? "is-split" : ""}`}>
              <h1 className="profile-name" aria-label={profile.full_name || DEFAULT_SITE_TITLE}>
                {profileName.lines.map((line, index) => (
                  <span
                    className={profileName.isSplit && index === profileName.lines.length - 1 ? "profile-name-given" : "profile-name-line"}
                    key={`${line}-${index}`}
                  >
                    {line}
                  </span>
                ))}
              </h1>
              <p className="profile-role">{profile.title}</p>
            </div>
            <div className="cv-actions no-print">
              <CvDownloadButton href={profile.cv_url} fileName={profile.cv_file_name} />
              <button className="button secondary cv-print-button" type="button" onClick={handleExportPdf}>
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M7 3h10v5H7z" />
                  <path d="M6 17H5a3 3 0 0 1-3-3v-3a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-1" />
                  <path d="M7 14h10v7H7z" />
                </svg>
                <span>Export PDF</span>
              </button>
            </div>

            <div className="contact-list">
              <h2>Contact Info</h2>
              {profile.email ? <a href={`mailto:${profile.email}`}>{profile.email}</a> : null}
              {profile.phone ? <a href={`tel:${profile.phone.replaceAll(" ", "")}`}>{profile.phone}</a> : null}
              {profile.location ? <span>{profile.location}</span> : null}
            </div>

            <div className="social-icons" aria-label="Social links">
              <SocialIconLink href={profile.github_url} type="github" label="GitHub" />
              <SocialIconLink href={profile.linkedin_url} type="linkedin" label="LinkedIn" />
              <SocialIconLink href={profile.instagram_url} type="instagram" label="Instagram" />
              <SocialIconLink href={profile.facebook_url} type="facebook" label="Facebook" />
            </div>
          </aside>

          <div className="cv-content">
            <section className="glass-panel">
              <h2>Professional Bio</h2>
              <p className="bio-text multiline-text">{profile.bio}</p>
            </section>

            <section className="glass-panel">
              <h2>Skills</h2>
              {effectiveSkills.status === "loading" ? <LoadingState /> : null}
              {effectiveSkills.status === "success" && skillEntries.length === 0 ? (
                <EmptyState message="Chưa có kỹ năng nào." />
              ) : null}
              {effectiveSkills.status === "success" && skillEntries.length > 0 ? (
                <div className="skills-grid skill-chip-grid">
                  {skillEntries.map(([group, groupSkills]) => (
                    <div className="skill-group skill-chip-group" key={group}>
                      <h3>{group}</h3>
                      <div className="skill-pill-row">
                        {groupSkills.map((skill) => (
                          <span className="skill-pill" key={`${group}-${skill.name}`}>{skill.name}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            {effectiveExperiences.status === "loading" ? <LoadingState /> : null}
            {effectiveExperiences.status === "success" && experiences.length > 0 ? (
              <section className="glass-panel">
                <h2>Experience</h2>
                <div className="timeline">
                  {experiences.map((item, index) => (
                    <article key={`${item.organization}-${index}`}>
                      <h3>{item.position} <span>- {item.organization}</span></h3>
                      <time>{item.time}</time>
                      <p className="multiline-text">{item.description}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="glass-panel">
              <h2>Education</h2>
              <div className="timeline simple">
                {education.map((item) => (
                  <article key={item.id}>
                    <h3>{item.degree} <span>- {item.school}</span></h3>
                    <time>{item.time}</time>
                    {item.description ? <p className="multiline-text">{item.description}</p> : null}
                  </article>
                ))}
              </div>
            </section>

            <section className="glass-panel">
              <h2>Certificates</h2>
              <ul className="certificate-list">
                {certificates.map((item) => (
                  <li key={item.id}>
                    {item.credential_url ? <a href={item.credential_url} target="_blank" rel="noreferrer">{item.title}</a> : item.title}
                    {item.issuer || item.time ? <span>{[item.issuer, item.time].filter(Boolean).join(" - ")}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function PremiumCVPage() {
  usePageTitle("CV");
  const content = usePortfolioContent();
  const profileState = useAsyncData(getProfile, []);
  const skillsState = useAsyncData(getSkills, []);
  const experiencesState = useAsyncData(getExperiences, []);
  const projectsState = useAsyncData(getProjects, []);
  const profile = getEffectiveProfile(content, profileState.data);
  const effectiveSkills = selectArrayState(skillsState, content.cvDraft?.skills, fallbackSkills);
  const effectiveExperiences = selectArrayState(experiencesState, content.cvDraft?.experiences, fallbackExperiences);
  const localProjects = Array.isArray(content.projectsDraft)
    ? content.projectsDraft.filter((item) => item.published !== false)
    : null;
  const effectiveProjects = selectArrayState(projectsState, localProjects, fallbackProjects.filter((item) => item.published));
  const education = useMemo(
    () => (content.cvDraft?.education ?? fallbackEducation).map(normalizeEducationItem),
    [content.cvDraft?.education]
  );
  const certificates = useMemo(
    () => (content.cvDraft?.certificates ?? fallbackCertificates).map(normalizeCertificateItem),
    [content.cvDraft?.certificates]
  );
  const skillGroups = useMemo(() => groupSkills(effectiveSkills.data ?? []), [effectiveSkills.data]);
  const skillEntries = useMemo(() => orderedSkillEntries(skillGroups), [skillGroups]);
  const experiences = useMemo(
    () => (effectiveExperiences.data ?? []).map(normalizeExperience),
    [effectiveExperiences.data]
  );

  function handleExportPdf() {
    const previousTitle = document.title;
    const fileBaseName = sampleCvPrintData.profile.full_name ? `${sampleCvPrintData.profile.full_name} CV` : "CV";
    document.title = fileBaseName;
    window.print();
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 500);
  }

  return (
    <main className="page-shell cv-premium-page">
      <div className="cv-screen-content">
        <div className="container cv-premium-container">
          <CvProfileHero profile={profile} onExportPdf={handleExportPdf} />

          <div className="cv-premium-layout">
            <aside className="cv-support-column">
              <CvSkillsSection status={effectiveSkills.status} skillEntries={skillEntries} />
              <CvEducationSection education={education} />
              <CvCertificatesSection certificates={certificates} />
            </aside>

            <div className="cv-main-column">
              <CvExperienceSection status={effectiveExperiences.status} experiences={experiences} />
            </div>
          </div>
        </div>
      </div>
      <CvPrintDocument
        profile={sampleCvPrintData.profile}
        skillEntries={sampleCvPrintData.skillEntries}
        education={sampleCvPrintData.education}
        certificates={sampleCvPrintData.certificates}
        experiences={sampleCvPrintData.experiences}
        projects={sampleCvPrintData.projects}
        aiTools={sampleCvPrintData.aiTools}
        goal={sampleCvPrintData.goal}
      />
    </main>
  );
}

function ProjectsPage() {
  usePageTitle("Projects");
  const { projectsDraft } = usePortfolioContent();
  const projectsState = useAsyncData(getProjects, []);
  const localProjects = Array.isArray(projectsDraft)
    ? projectsDraft.filter((item) => item.published !== false)
    : null;
  const effectiveProjects = selectArrayState(
    projectsState,
    localProjects,
    fallbackProjects.filter((item) => item.published)
  );

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link><span>/</span><span>Projects</span>
        </nav>
        <SectionTitle
          kicker="Project index"
          title="Projects"
          description="Các dự án/sản phẩm tôi đã thực hiện, có trạng thái, tech stack và trang detail riêng."
        />
        <CollectionState state={effectiveProjects} emptyMessage="Chưa có project nào.">
          {(items) => (
            <div className="card-grid three">
              {items.map((project, index) => <ProjectCard key={project.id ?? project.slug} project={project} index={index} />)}
            </div>
          )}
        </CollectionState>
      </div>
    </main>
  );
}

function ProjectDetailContent({ projectData }) {
  const project = normalizeProject(projectData);
  const heroImageUrl = coalesce(
    project.app_demo_image_url,
    project.web_demo_image_url,
    project.cover_url
  );

  return (
    <main className="detail-shell">
      <section className="detail-hero">
        <div className="container detail-head">
          <Link className="back-link" to="/projects">← Back to Projects</Link>
          <div className="detail-title-row">
            <div>
              <p className="kicker">Project Detail</p>
              <h1>{project.title}</h1>
              <p>{project.description}</p>
            </div>
            <div className="detail-tags">
              {project.tech_stack.map((tech) => <Badge key={tech}>{tech}</Badge>)}
              <span className="status-chip large">{project.status}</span>
            </div>
          </div>
        </div>
        <div className="detail-cover">
          <ImageWithFallback
            src={heroImageUrl}
            alt={`${project.title} demo`}
            kind={project.visual_kind}
            size="cover"
            className="project-detail-demo-banner"
          />
        </div>
      </section>

      <section className="detail-content-section">
        <div className="container narrow">
          <div className="button-row">
            {project.demo_url ? <ButtonLink href={project.demo_url} label="View Live Demo" external /> : null}
            {project.github_url ? <ButtonLink href={project.github_url} label="View on GitHub" variant="secondary" external /> : null}
          </div>
          <article className="markdown-content">
            <ReactMarkdown>{project.content}</ReactMarkdown>
          </article>
        </div>
      </section>
    </main>
  );
}

function ProjectDetailPage() {
  const { slug } = useParams();
  const { projectsDraft } = usePortfolioContent();
  const projectState = useAsyncData(() => getProjectBySlug(slug), [slug]);

  usePageTitle("Project Detail");

  if (Array.isArray(projectsDraft)) {
    const localProject = projectsDraft.find((item) => item.slug === slug && item.published !== false);
    if (!localProject) {
      return <NotFoundPage eyebrow="Project" message="Project slug không tồn tại hoặc chưa được publish." />;
    }
    return <ProjectDetailContent projectData={localProject} />;
  }

  if (projectState.status === "loading") {
    return <main className="page-shell"><div className="container"><LoadingState /></div></main>;
  }

  if (projectState.status === "error") {
    const fallbackProject = fallbackProjects.find((item) => item.slug === slug && item.published);
    if (fallbackProject) return <ProjectDetailContent projectData={fallbackProject} />;
    return <NotFoundPage eyebrow="Project" message="Project slug không tồn tại hoặc chưa được publish." />;
  }

  if (!projectState.data) {
    return <NotFoundPage eyebrow="Project" message="Project slug không tồn tại hoặc chưa được publish." />;
  }

  return <ProjectDetailContent projectData={projectState.data} />;
}

function NewsPage() {
  usePageTitle("News");
  const { newsDraft } = usePortfolioContent();
  const newsState = useAsyncData(getNews, []);
  const localNews = Array.isArray(newsDraft)
    ? sortByCreatedDesc(newsDraft.filter((item) => item.published !== false))
    : null;
  const effectiveNews = selectArrayState(newsState, localNews, fallbackNews);

  return (
    <main className="page-shell">
      <div className="container">
        <SectionTitle
          kicker="Articles"
          title="News"
          description="Bài viết, ghi chú và nhật ký phát triển."
        />
        <CollectionState state={effectiveNews} emptyMessage="Chưa có bài viết nào.">
          {(items) => (
            <div className="card-grid three">
              {items.map((post, index) => <NewsCard key={post.id ?? post.slug} post={post} index={index} />)}
            </div>
          )}
        </CollectionState>
      </div>
    </main>
  );
}

function NewsDetailPage() {
  const { slug } = useParams();
  const { newsDraft } = usePortfolioContent();
  const newsState = useAsyncData(() => getNewsBySlug(slug), [slug]);

  usePageTitle("Article");

  if (Array.isArray(newsDraft)) {
    const localPost = newsDraft.find((item) => item.slug === slug && item.published !== false);
    if (!localPost) {
      return <NotFoundPage eyebrow="News" message="Bài viết không tồn tại hoặc chưa được publish." />;
    }
    return <NewsDetailContent postData={localPost} />;
  }

  if (newsState.status === "loading") {
    return <main className="page-shell"><div className="container"><LoadingState /></div></main>;
  }

  if (newsState.status === "error") {
    const fallbackPost = fallbackNews.find((item) => item.slug === slug && item.published);
    if (!fallbackPost) {
      return <NotFoundPage eyebrow="News" message="Bài viết không tồn tại hoặc chưa được publish." />;
    }
    return <NewsDetailContent postData={fallbackPost} />;
  }

  if (!newsState.data) {
    return <NotFoundPage eyebrow="News" message="Bài viết không tồn tại hoặc chưa được publish." />;
  }

  return <NewsDetailContent postData={newsState.data} />;
}

function NewsDetailContent({ postData }) {
  const post = normalizeNews(postData);

  return (
    <main className="article-shell">
      <article className="article-card">
        <div className="article-nav">
          <div>
            <NavLink to="/projects">Projects</NavLink>
            <NavLink className="active" to="/news">Articles</NavLink>
            <NavLink to="/cv">CV</NavLink>
          </div>
        </div>
        <Link className="back-link" to="/news">← Back to News</Link>
        <div className="article-cover">
          <ImageWithFallback
            src={post.cover_url}
            alt={post.title}
            kind={post.cover_kind}
            size="cover"
          />
        </div>
        <div className="article-meta">
          <Badge tone="category">{post.category}</Badge>
          <span>By {post.author}</span>
          <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
        </div>
        <h1>{post.title}</h1>
        <p className="article-excerpt">{post.excerpt}</p>
        <div className="tag-row">
          {post.tags.map((tag) => <span key={tag}>#{tag}</span>)}
        </div>
        <div className="markdown-content">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
      </article>
    </main>
  );
}

function Field({ label, value, onChange, multiline = false, type = "text", placeholder = "", className = "" }) {
  return (
    <label className={`field ${className}`.trim()}>
      <span>{label}</span>
      {multiline ? (
        <textarea value={value ?? ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input type={type} value={value ?? ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="toggle-field">
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function FileUploadField({ label, accept, fileName, onFileReady, imageOptions = null }) {
  const [error, setError] = useState("");

  async function handleChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = imageOptions
        ? await optimizeImageFile(file, imageOptions)
        : await readFileAsDataUrl(file);
      onFileReady(dataUrl, file.name);
      setError("");
    } catch {
      setError("Cannot read this file.");
    }
  }

  return (
    <label className="field file-field">
      <span>{label}</span>
      <input type="file" accept={accept} onChange={handleChange} />
      {fileName ? <small>Selected: {fileName}</small> : null}
      {error ? <small className="form-error">{error}</small> : null}
    </label>
  );
}

function AdminLogin() {
  const { login } = usePortfolioContent();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    const accepted = await login(password);
    setIsSubmitting(false);

    if (!accepted) {
      setError("Sai mật khẩu admin.");
      return;
    }

    setError("");
  }

  return (
    <main className="admin-shell login-shell">
      <section className="admin-login-card">
        <p className="kicker">Admin Studio</p>
        <h1>Đăng nhập quản trị</h1>
        <form onSubmit={handleSubmit}>
          <Field
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Nhập mật khẩu"
          />
          {error ? <p className="form-error">{error}</p> : null}
          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </section>
    </main>
  );
}

function ProfileEditor() {
  const content = usePortfolioContent();
  const profileState = useAsyncData(getProfile, []);
  const sourceProfile = getEffectiveProfile(content, profileState.data);
  const [form, setForm] = useState(() => toEditableProfile(sourceProfile));
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setForm(toEditableProfile(sourceProfile));
  }, [content.profileDraft, profileState.status, profileState.data]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function save() {
    content.saveProfile(form);
    setNotice("Đã lưu lời chào và hồ sơ CV.");
  }

  function reset() {
    content.resetProfile();
    setNotice("Đã xoá bản chỉnh local của hồ sơ.");
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <p className="kicker">Home & CV</p>
          <h2>Lời chào và hồ sơ</h2>
        </div>
        <div className="admin-actions">
          <button className="button secondary" type="button" onClick={reset}>Reset</button>
          <button className="button" type="button" onClick={save}>Lưu thay đổi</button>
        </div>
      </div>
      {notice ? <p className="admin-notice">{notice}</p> : null}
      <div className="form-grid two profile-form-grid">
        <Field label="Lời chào hero" value={form.greeting} onChange={(value) => updateField("greeting", value)} />
        <Field label="Họ tên" value={form.full_name} onChange={(value) => updateField("full_name", value)} />
        <Field label="Ngày sinh" type="date" value={form.birth_date} onChange={(value) => updateField("birth_date", value)} />
        <Field label="Website URL" value={form.website_url} onChange={(value) => updateField("website_url", value)} />
        <div className="profile-field-stack">
          <Field label="Chức danh" value={form.title} onChange={(value) => updateField("title", value)} />
          <div className="file-upload-row cv-upload-row">
            <Field label="CV PDF URL" value={form.cv_url} onChange={(value) => updateField("cv_url", value)} />
            <FileUploadField
              label="Upload CV PDF"
              accept="application/pdf"
              fileName={form.cv_file_name}
              onFileReady={(dataUrl, fileName) => setForm((current) => ({ ...current, cv_url: dataUrl, cv_file_name: fileName }))}
            />
          </div>
        </div>
        <div className="file-upload-row avatar-upload-row">
          <Field label="Avatar URL" value={form.avatar_url} onChange={(value) => updateField("avatar_url", value)} />
          <FileUploadField
            label="Upload avatar image"
            accept="image/*"
            fileName={form.avatar_file_name}
            onFileReady={(dataUrl, fileName) => setForm((current) => ({ ...current, avatar_url: dataUrl, avatar_file_name: fileName }))}
          />
        </div>
        <Field label="Email" value={form.email} onChange={(value) => updateField("email", value)} />
        <Field label="Số điện thoại" value={form.phone} onChange={(value) => updateField("phone", value)} />
        <Field label="Địa điểm" value={form.location} onChange={(value) => updateField("location", value)} />
        <Field label="GitHub URL" value={form.github_url} onChange={(value) => updateField("github_url", value)} />
        <Field label="Instagram URL" value={form.instagram_url} onChange={(value) => updateField("instagram_url", value)} />
        <Field label="Facebook URL" value={form.facebook_url} onChange={(value) => updateField("facebook_url", value)} />
      </div>
      <Field className="profile-bio-field" label="Bio / giới thiệu CV" value={form.bio} multiline onChange={(value) => updateField("bio", value)} />
    </section>
  );
}

function CvEditor() {
  const content = usePortfolioContent();
  const skillsState = useAsyncData(getSkills, []);
  const experiencesState = useAsyncData(getExperiences, []);
  const sourceSkills = Array.isArray(content.cvDraft?.skills)
    ? content.cvDraft.skills
    : skillsState.status === "success" && skillsState.data?.length
      ? skillsState.data
      : fallbackSkills;
  const sourceExperiences = Array.isArray(content.cvDraft?.experiences)
    ? content.cvDraft.experiences
    : experiencesState.status === "success" && experiencesState.data?.length
      ? experiencesState.data
      : fallbackExperiences;
  const sourceEducation = Array.isArray(content.cvDraft?.education) ? content.cvDraft.education : fallbackEducation;
  const sourceCertificates = Array.isArray(content.cvDraft?.certificates) ? content.cvDraft.certificates : fallbackCertificates;
  const [skills, setSkills] = useState(() => sourceSkills.map((item, index) => ({
    id: item.id ?? `skill-${index}`,
    name: item.name ?? item.title ?? "",
    category: normalizeSkillGroup(item.category ?? item.group ?? item.group_name ?? "Frontend")
  })));
  const [experiences, setExperiences] = useState(() => sourceExperiences.map((item, index) => {
    const normalized = normalizeExperience(item);
    return {
      id: item.id ?? `exp-${index}`,
      organization: normalized.organization,
      position: normalized.position,
      time: normalized.time,
      description: normalized.description
    };
  }));
  const [education, setEducation] = useState(() => sourceEducation.map(normalizeEducationItem));
  const [certificates, setCertificates] = useState(() => sourceCertificates.map(normalizeCertificateItem));
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setSkills(sourceSkills.map((item, index) => ({
      id: item.id ?? `skill-${index}`,
      name: item.name ?? item.title ?? "",
      category: normalizeSkillGroup(item.category ?? item.group ?? item.group_name ?? "Frontend")
    })));
  }, [content.cvDraft, skillsState.status, skillsState.data]);

  useEffect(() => {
    setExperiences(sourceExperiences.map((item, index) => {
      const normalized = normalizeExperience(item);
      return {
        id: item.id ?? `exp-${index}`,
        organization: normalized.organization,
        position: normalized.position,
        time: normalized.time,
        description: normalized.description
      };
    }));
  }, [content.cvDraft, experiencesState.status, experiencesState.data]);

  useEffect(() => {
    setEducation(sourceEducation.map(normalizeEducationItem));
  }, [content.cvDraft]);

  useEffect(() => {
    setCertificates(sourceCertificates.map(normalizeCertificateItem));
  }, [content.cvDraft]);

  function updateSkill(id, patch) {
    setSkills((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function updateExperience(id, patch) {
    setExperiences((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function updateEducation(id, patch) {
    setEducation((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function updateCertificate(id, patch) {
    setCertificates((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function save() {
    content.saveCv({
      skills: skills.map((item) => ({
        id: item.id,
        name: item.name,
        category: normalizeSkillGroup(item.category)
      })),
      experiences: experiences.map((item) => ({
        id: item.id,
        organization: item.organization,
        company: item.organization,
        position: item.position,
        time: item.time,
        description: item.description
      })),
      education: education.map((item) => ({
        id: item.id,
        school: item.school,
        degree: item.degree,
        time: item.time,
        description: item.description
      })),
      certificates: certificates.map((item) => ({
        id: item.id,
        title: item.title,
        issuer: item.issuer,
        time: item.time,
        credential_url: item.credential_url
      }))
    });
    setNotice("Đã lưu nội dung CV.");
  }

  function reset() {
    content.resetCv();
    setNotice("Đã xoá bản chỉnh local của CV.");
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <p className="kicker">CV Content</p>
          <h2>Chỉnh sửa CV</h2>
        </div>
        <div className="admin-actions">
          <button className="button secondary" type="button" onClick={reset}>Reset</button>
          <button className="button" type="button" onClick={save}>Lưu CV</button>
        </div>
      </div>
      {notice ? <p className="admin-notice">{notice}</p> : null}

      <div className="editor-section">
        <div className="editor-section-head">
          <h3>Skills</h3>
          <button
            className="button ghost"
            type="button"
            onClick={() => setSkills((items) => [...items, { id: `skill-${Date.now()}`, name: "New skill", category: "Frontend" }])}
          >
            Thêm skill
          </button>
        </div>
        <div className="admin-list">
          {skills.map((skill) => (
            <article className="mini-editor skill-editor" key={skill.id}>
              <Field label="Tên skill" value={skill.name} onChange={(value) => updateSkill(skill.id, { name: value })} />
              <Field label="Nhóm" value={skill.category} placeholder="Frontend / Backend / Database / Tools / AI" onChange={(value) => updateSkill(skill.id, { category: value })} />
              <button className="text-button danger" type="button" onClick={() => setSkills((items) => items.filter((item) => item.id !== skill.id))}>Xoá</button>
            </article>
          ))}
        </div>
      </div>

      <div className="editor-section">
        <div className="editor-section-head">
          <h3>Experience</h3>
          <button
            className="button ghost"
            type="button"
            onClick={() => setExperiences((items) => [...items, { id: `exp-${Date.now()}`, organization: "Company or project", position: "Role", time: "2026", description: "" }])}
          >
            Thêm experience
          </button>
        </div>
        <div className="admin-list">
          {experiences.map((item) => (
            <article className="mini-editor wide" key={item.id}>
              <Field label="Vị trí" value={item.position} onChange={(value) => updateExperience(item.id, { position: value })} />
              <Field label="Công ty hoặc dự án" value={item.organization} onChange={(value) => updateExperience(item.id, { organization: value })} />
              <Field label="Thời gian" value={item.time} onChange={(value) => updateExperience(item.id, { time: value })} />
              <Field label="Mô tả" value={item.description} multiline onChange={(value) => updateExperience(item.id, { description: value })} />
              <button className="text-button danger" type="button" onClick={() => setExperiences((items) => items.filter((entry) => entry.id !== item.id))}>Xoá</button>
            </article>
          ))}
        </div>
      </div>

      <div className="editor-section">
        <div className="editor-section-head">
          <h3>Education</h3>
          <button
            className="button ghost"
            type="button"
            onClick={() => setEducation((items) => [...items, { id: `edu-${Date.now()}`, school: "School", degree: "Degree", time: "2026", description: "" }])}
          >
            Thêm education
          </button>
        </div>
        <div className="admin-list">
          {education.map((item) => (
            <article className="mini-editor wide" key={item.id}>
              <Field label="Bằng cấp / khoá học" value={item.degree} onChange={(value) => updateEducation(item.id, { degree: value })} />
              <Field label="Trường / tổ chức" value={item.school} onChange={(value) => updateEducation(item.id, { school: value })} />
              <Field label="Thời gian" value={item.time} onChange={(value) => updateEducation(item.id, { time: value })} />
              <Field label="Mô tả" value={item.description} multiline onChange={(value) => updateEducation(item.id, { description: value })} />
              <button className="text-button danger" type="button" onClick={() => setEducation((items) => items.filter((entry) => entry.id !== item.id))}>Xoá</button>
            </article>
          ))}
        </div>
      </div>

      <div className="editor-section">
        <div className="editor-section-head">
          <h3>Certificates</h3>
          <button
            className="button ghost"
            type="button"
            onClick={() => setCertificates((items) => [...items, { id: `cert-${Date.now()}`, title: "Certificate", issuer: "Issuer", time: "2026", credential_url: "" }])}
          >
            Thêm certificate
          </button>
        </div>
        <div className="admin-list">
          {certificates.map((item) => (
            <article className="mini-editor certificate-editor" key={item.id}>
              <Field label="Tên certificate" value={item.title} onChange={(value) => updateCertificate(item.id, { title: value })} />
              <Field label="Tổ chức cấp" value={item.issuer} onChange={(value) => updateCertificate(item.id, { issuer: value })} />
              <Field label="Thời gian" value={item.time} onChange={(value) => updateCertificate(item.id, { time: value })} />
              <Field label="Credential URL" value={item.credential_url} onChange={(value) => updateCertificate(item.id, { credential_url: value })} />
              <button className="text-button danger" type="button" onClick={() => setCertificates((items) => items.filter((entry) => entry.id !== item.id))}>Xoá</button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectsEditor() {
  const content = usePortfolioContent();
  const projectsState = useAsyncData(getProjects, []);
  const sourceProjects = Array.isArray(content.projectsDraft)
    ? content.projectsDraft
    : projectsState.status === "success" && projectsState.data?.length
      ? projectsState.data
      : fallbackProjects;
  const [projects, setProjects] = useState(() => sourceProjects.map(toEditableProject));
  const [activeId, setActiveId] = useState(() => sourceProjects[0]?.id ?? sourceProjects[0]?.slug ?? "");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const nextProjects = sourceProjects.map(toEditableProject);
    setProjects(nextProjects);
    setActiveId((current) => nextProjects.some((item) => item.id === current) ? current : nextProjects[0]?.id ?? "");
  }, [content.projectsDraft, projectsState.status, projectsState.data]);

  const activeProject = projects.find((item) => item.id === activeId) ?? projects[0];

  function updateActive(patch) {
    setProjects((items) => items.map((item) => item.id === activeProject.id ? { ...item, ...patch } : item));
  }

  function addProject() {
    const id = `local-${Date.now()}`;
    const nextProject = toEditableProject({
      id,
      title: "Project mới",
      slug: `project-moi-${Date.now()}`,
      description: "Mô tả ngắn cho project mới.",
      content: "## Tổng quan\nViết nội dung Markdown cho project tại đây.",
      tech_stack: ["React"],
      status: "draft",
      is_featured: false,
      published: true,
      created_at: new Date().toISOString(),
      app_demo_image_url: "",
      web_demo_image_url: "",
      app_demo_file_name: "",
      web_demo_file_name: "",
      visual_kind: "portfolio"
    });
    setProjects((items) => [...items, nextProject]);
    setActiveId(id);
  }

  async function save() {
    setIsSaving(true);
    setNotice("Đang tối ưu ảnh và lưu projects...");

    try {
      const optimizedProjects = await Promise.all(projects.map(optimizeProjectImages));
      setProjects(optimizedProjects);
      const saved = await content.saveProjects(optimizedProjects.map(fromEditableProject));
      setNotice(saved
        ? "Đã tối ưu ảnh và lưu danh sách projects."
        : "Chưa lưu được lên kho dữ liệu. Bản chỉnh sửa vẫn còn trong localStorage.");
    } catch (error) {
      console.warn("Unable to optimize project images", error);
      setNotice("Không thể tối ưu ảnh. Vui lòng chọn ảnh khác rồi thử lại.");
    } finally {
      setIsSaving(false);
    }
  }

  function reset() {
    content.resetProjects();
    setNotice("Đã xoá bản chỉnh local của projects.");
  }

  return (
    <section className="admin-panel project-editor-panel">
      <div className="admin-panel-head">
        <div>
          <p className="kicker">Project CMS</p>
          <h2>Chỉnh sửa Projects</h2>
        </div>
        <div className="admin-actions">
          <button className="button ghost" type="button" onClick={addProject}>Thêm project</button>
          <button className="button secondary" type="button" onClick={reset}>Reset</button>
          <button className="button" type="button" onClick={save} disabled={isSaving}>
            {isSaving ? "Đang lưu..." : "Lưu Projects"}
          </button>
        </div>
      </div>
      {notice ? <p className="admin-notice">{notice}</p> : null}

      <div className="project-editor-layout">
        <aside className="project-picker">
          {projects.map((project) => (
            <button
              key={project.id}
              className={project.id === activeProject?.id ? "active" : ""}
              type="button"
              onClick={() => setActiveId(project.id)}
            >
              <strong>{project.title || "Untitled"}</strong>
              <span>{project.slug}</span>
            </button>
          ))}
        </aside>

        {activeProject ? (
          <div className="project-form">
            <div className="form-grid two">
              <Field label="Title" value={activeProject.title} onChange={(value) => updateActive({ title: value })} />
              <div className="field with-action">
                <span>Slug</span>
                <div>
                  <input value={activeProject.slug ?? ""} onChange={(event) => updateActive({ slug: event.target.value })} />
                  <button type="button" onClick={() => updateActive({ slug: slugify(activeProject.title) })}>Tạo slug</button>
                </div>
              </div>
              <Field label="Status" value={activeProject.status} onChange={(value) => updateActive({ status: value })} />
              <Field label="Tech stack" value={activeProject.tech_stack_text} onChange={(value) => updateActive({ tech_stack_text: value })} />
              <Field label="Thumbnail URL" value={activeProject.thumbnail_url} onChange={(value) => updateActive({ thumbnail_url: value })} />
              <Field label="Cover URL" value={activeProject.cover_url} onChange={(value) => updateActive({ cover_url: value })} />
              <Field label="Demo URL" value={activeProject.demo_url} onChange={(value) => updateActive({ demo_url: value })} />
              <Field label="GitHub URL" value={activeProject.github_url} onChange={(value) => updateActive({ github_url: value })} />
            </div>
            <div className="project-demo-admin-grid">
              <div className="file-upload-row">
                <Field label="App demo image URL" value={activeProject.app_demo_image_url} onChange={(value) => updateActive({ app_demo_image_url: value })} />
                <FileUploadField
                  label="Upload App demo image"
                  accept="image/*"
                  fileName={activeProject.app_demo_file_name}
                  imageOptions={PROJECT_IMAGE_OPTIONS}
                  onFileReady={(dataUrl, fileName) => updateActive({ app_demo_image_url: dataUrl, app_demo_file_name: fileName })}
                />
                {activeProject.app_demo_image_url ? (
                  <img className="admin-image-preview" src={activeProject.app_demo_image_url} alt="App demo preview" />
                ) : null}
              </div>
              <div className="file-upload-row">
                <Field label="Web demo image URL" value={activeProject.web_demo_image_url} onChange={(value) => updateActive({ web_demo_image_url: value })} />
                <FileUploadField
                  label="Upload Web demo image"
                  accept="image/*"
                  fileName={activeProject.web_demo_file_name}
                  imageOptions={PROJECT_IMAGE_OPTIONS}
                  onFileReady={(dataUrl, fileName) => updateActive({ web_demo_image_url: dataUrl, web_demo_file_name: fileName })}
                />
                {activeProject.web_demo_image_url ? (
                  <img className="admin-image-preview" src={activeProject.web_demo_image_url} alt="Web demo preview" />
                ) : null}
              </div>
            </div>
            <Field label="Description" value={activeProject.description} multiline onChange={(value) => updateActive({ description: value })} />
            <Field label="Content Markdown" value={activeProject.content} multiline onChange={(value) => updateActive({ content: value })} />
            <div className="toggle-row">
              <ToggleField label="Published" checked={activeProject.published} onChange={(value) => updateActive({ published: value })} />
              <ToggleField label="Featured" checked={activeProject.is_featured} onChange={(value) => updateActive({ is_featured: value })} />
              <button
                className="text-button danger"
                type="button"
                onClick={() => setProjects((items) => items.filter((item) => item.id !== activeProject.id))}
              >
                Xoá project này
              </button>
            </div>
          </div>
        ) : (
          <EmptyState message="Chưa có project nào để chỉnh sửa." />
        )}
      </div>
    </section>
  );
}

function NewsEditor() {
  const content = usePortfolioContent();
  const newsState = useAsyncData(getNews, []);
  const sourceNews = Array.isArray(content.newsDraft)
    ? content.newsDraft
    : newsState.status === "success" && newsState.data?.length
      ? newsState.data
      : fallbackNews;
  const [posts, setPosts] = useState(() => sourceNews.map(toEditableNews));
  const [activeId, setActiveId] = useState(() => sourceNews[0]?.id ?? sourceNews[0]?.slug ?? "");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const nextPosts = sourceNews.map(toEditableNews);
    setPosts(nextPosts);
    setActiveId((current) => nextPosts.some((item) => item.id === current) ? current : nextPosts[0]?.id ?? "");
  }, [content.newsDraft, newsState.status, newsState.data]);

  const activePost = posts.find((item) => item.id === activeId) ?? posts[0];

  function updateActive(patch) {
    setPosts((items) => items.map((item) => item.id === activePost.id ? { ...item, ...patch } : item));
  }

  function addPost() {
    const id = `news-${Date.now()}`;
    const nextPost = toEditableNews({
      id,
      title: "Bài viết mới",
      slug: `bai-viet-moi-${Date.now()}`,
      excerpt: "Mô tả ngắn cho bài viết mới.",
      content: "## Mở đầu\nViết nội dung Markdown cho bài viết tại đây.",
      thumbnail_url: "",
      cover_url: "",
      author: DEFAULT_SITE_TITLE,
      category: "Dev Log",
      tags: ["react"],
      published: true,
      created_at: new Date().toISOString(),
      visual_kind: "markdown",
      cover_kind: "markdown-wide"
    });
    setPosts((items) => [nextPost, ...items]);
    setActiveId(id);
  }

  function save() {
    content.saveNews(posts.map(fromEditableNews));
    setNotice("Đã lưu danh sách news.");
  }

  function reset() {
    content.resetNews();
    setNotice("Đã xoá bản chỉnh local của news.");
  }

  return (
    <section className="admin-panel project-editor-panel">
      <div className="admin-panel-head">
        <div>
          <p className="kicker">News CMS</p>
          <h2>Chỉnh sửa News</h2>
        </div>
        <div className="admin-actions">
          <button className="button ghost" type="button" onClick={addPost}>Thêm bài viết</button>
          <button className="button secondary" type="button" onClick={reset}>Reset</button>
          <button className="button" type="button" onClick={save}>Lưu News</button>
        </div>
      </div>
      {notice ? <p className="admin-notice">{notice}</p> : null}

      <div className="project-editor-layout">
        <aside className="project-picker">
          {posts.map((post) => (
            <button
              key={post.id}
              className={post.id === activePost?.id ? "active" : ""}
              type="button"
              onClick={() => setActiveId(post.id)}
            >
              <strong>{post.title || "Untitled"}</strong>
              <span>{post.slug}</span>
            </button>
          ))}
        </aside>

        {activePost ? (
          <div className="project-form">
            <div className="form-grid two">
              <Field label="Title" value={activePost.title} onChange={(value) => updateActive({ title: value })} />
              <div className="field with-action">
                <span>Slug</span>
                <div>
                  <input value={activePost.slug ?? ""} onChange={(event) => updateActive({ slug: event.target.value })} />
                  <button type="button" onClick={() => updateActive({ slug: slugify(activePost.title) })}>Tạo slug</button>
                </div>
              </div>
              <Field label="Author" value={activePost.author} onChange={(value) => updateActive({ author: value })} />
              <Field label="Category" value={activePost.category} onChange={(value) => updateActive({ category: value })} />
              <Field label="Tags" value={activePost.tags_text} onChange={(value) => updateActive({ tags_text: value })} />
              <Field label="Created at" value={activePost.created_at} onChange={(value) => updateActive({ created_at: value })} />
              <Field label="Thumbnail URL" value={activePost.thumbnail_url} onChange={(value) => updateActive({ thumbnail_url: value })} />
              <Field label="Cover URL" value={activePost.cover_url} onChange={(value) => updateActive({ cover_url: value })} />
            </div>
            <Field label="Excerpt" value={activePost.excerpt} multiline onChange={(value) => updateActive({ excerpt: value })} />
            <Field label="Content Markdown" value={activePost.content} multiline onChange={(value) => updateActive({ content: value })} />
            <div className="toggle-row">
              <ToggleField label="Published" checked={activePost.published} onChange={(value) => updateActive({ published: value })} />
              <button
                className="text-button danger"
                type="button"
                onClick={() => setPosts((items) => items.filter((item) => item.id !== activePost.id))}
              >
                Xoá bài viết này
              </button>
            </div>
          </div>
        ) : (
          <EmptyState message="Chưa có bài viết nào để chỉnh sửa." />
        )}
      </div>
    </section>
  );
}

function ContactEditor() {
  const content = usePortfolioContent();
  const profileState = useAsyncData(getProfile, []);
  const sourceContact = toEditableContact(getEffectiveProfile(content, profileState.data));
  const [form, setForm] = useState(sourceContact);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setForm(sourceContact);
  }, [content.profileDraft, content.contactDraft, profileState.status, profileState.data]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function save() {
    content.saveContact(form);
    setNotice("Đã lưu nội dung contact.");
  }

  function reset() {
    content.resetContact();
    setNotice("Đã xoá bản chỉnh local của contact.");
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <p className="kicker">Contact Surface</p>
          <h2>Chỉnh sửa Contact</h2>
        </div>
        <div className="admin-actions">
          <button className="button secondary" type="button" onClick={reset}>Reset</button>
          <button className="button" type="button" onClick={save}>Lưu Contact</button>
        </div>
      </div>
      {notice ? <p className="admin-notice">{notice}</p> : null}
      <div className="form-grid two">
        <Field label="Tiêu đề Contact" value={form.contact_headline} onChange={(value) => updateField("contact_headline", value)} />
        <Field label="Email" value={form.email} onChange={(value) => updateField("email", value)} />
        <Field label="Số điện thoại" value={form.phone} onChange={(value) => updateField("phone", value)} />
        <Field label="Địa điểm" value={form.location} onChange={(value) => updateField("location", value)} />
        <Field label="GitHub URL" value={form.github_url} onChange={(value) => updateField("github_url", value)} />
        <Field label="Instagram URL" value={form.instagram_url} onChange={(value) => updateField("instagram_url", value)} />
        <Field label="Facebook URL" value={form.facebook_url} onChange={(value) => updateField("facebook_url", value)} />
      </div>
      <Field label="Ghi chú Contact" value={form.contact_note} multiline onChange={(value) => updateField("contact_note", value)} />
    </section>
  );
}

function AdminPage() {
  usePageTitle("Admin Studio");
  const { isAdmin, logout, syncState } = usePortfolioContent();
  const [tab, setTab] = useState("profile");

  if (!isAdmin) return <AdminLogin />;

  const tabs = [
    { id: "profile", label: "Lời chào" },
    { id: "cv", label: "CV" },
    { id: "projects", label: "Projects" },
    { id: "news", label: "News" },
    { id: "contact", label: "Contact" }
  ];

  return (
    <main className="admin-shell">
      <div className="container admin-grid">
        <aside className="admin-sidebar">
          <p className="kicker">Signed in</p>
          <h1>Admin Studio</h1>
          <p className={`sync-status ${syncState.status}`}>
            <span></span>
            {syncState.message}
          </p>
          <div className="admin-tabs">
            {tabs.map((item) => (
              <button
                key={item.id}
                className={tab === item.id ? "active" : ""}
                type="button"
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button className="button secondary" type="button" onClick={logout}>Đăng xuất</button>
        </aside>
        <div className="admin-workspace">
          {tab === "profile" ? <ProfileEditor /> : null}
          {tab === "cv" ? <CvEditor /> : null}
          {tab === "projects" ? <ProjectsEditor /> : null}
          {tab === "news" ? <NewsEditor /> : null}
          {tab === "contact" ? <ContactEditor /> : null}
        </div>
      </div>
    </main>
  );
}

function NotFoundPage({
  eyebrow = "404",
  message = "Có vẻ như trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển."
}) {
  usePageTitle("404");

  return (
    <main className="notfound-shell">
      <div className="container notfound-grid">
        <section className="notfound-copy">
          <p className="kicker">{eyebrow}</p>
          <h1>404</h1>
          <h2>Không tìm thấy nội dung</h2>
          <p>{message} Hãy thử quay lại trang chủ hoặc khám phá các dự án và tin tức mới nhất.</p>
          <div className="hero-actions">
            <ButtonLink href="/" label="Về Home" />
            <ButtonLink href="/projects" label="Xem Projects" variant="secondary" />
            <ButtonLink href="/news" label="Đọc News" variant="ghost" />
          </div>
        </section>
        <div className="notfound-art" aria-hidden="true">
          <div className="code-board">
            <span></span><span></span><span></span><span></span>
          </div>
          <div className="bot-head"><i></i><b></b><b></b></div>
          <div className="bot-body"></div>
        </div>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <PortfolioProvider>
      <ScrollManager />
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cv" element={<PremiumCVPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:slug" element={<ProjectDetailPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:slug" element={<NewsDetailPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Footer />
    </PortfolioProvider>
  );
}
