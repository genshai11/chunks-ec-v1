import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  BookOpen,
  Trophy,
  User,
  ChevronRight,
  TrendingUp,
  Shield,
  LogOut,
  Mic,
  Menu,
  X,
  Flame,
  Info
} from "lucide-react";
import { CoinBadge } from "@/components/ui/CoinBadge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/hooks/useUserData";
import { useStreak } from "@/hooks/useStreak";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AccentThemePicker } from "@/components/ui/AccentThemePicker";
import logo from "@/assets/logo.png";

const menuItems = [
  { id: "dashboard", path: "/", label: "Dashboard", icon: Home },
  { id: "introduction", path: "/introduction", label: "Project Info", icon: Info },
  { id: "courses", path: "/courses", label: "Courses", icon: BookOpen },
  { id: "practice", path: "/practice", label: "Practice", icon: Mic },
  { id: "progress", path: "/progress", label: "Progress", icon: TrendingUp },
  { id: "leaderboard", path: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

const bottomItems = [
  { id: "profile", path: "/profile", label: "Profile", icon: User },
];

export const Sidebar = () => {
  const { isAdmin, signOut } = useAuth();
  const { data: wallet } = useWallet();
  const { data: streak } = useStreak();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sidebar-nav-collapsed") === "1";
  });

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sidebar-nav-collapsed", isNavCollapsed ? "1" : "0");
      document.documentElement.style.setProperty(
        "--learner-sidebar-width",
        isNavCollapsed ? "5rem" : "16rem"
      );
    }
  }, [isNavCollapsed]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const currentStreak = streak?.current_streak || 0;
  const isStreakActive = streak?.last_practice_date === new Date().toISOString().split('T')[0];

  const BrandLockup = ({ compact = false }: { compact?: boolean }) => (
    <div className={cn("flex items-center", compact ? "justify-center" : "gap-3")}>
      <img src={logo} alt="CHUNKS" className={cn(compact ? "h-8 w-auto" : "h-10 w-auto")} />
      {!compact && (
      <div className="leading-tight">
        <p className={cn(
          "font-black tracking-tight text-foreground",
          compact ? "text-lg" : "text-xl"
        )}>
          Chunks
        </p>
        <p className={cn(
          "uppercase tracking-[0.22em] text-muted-foreground",
          compact ? "text-[9px]" : "text-[10px]"
        )}>
          Speaking Lab
        </p>
      </div>
      )}
    </div>
  );

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => {
    const compactNav = !mobile && isNavCollapsed;

    return (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-2">
          <Link to="/" onClick={() => setIsMobileOpen(false)}>
          <motion.div
            className="flex items-center"
            whileHover={{ scale: 1.02 }}
          >
            <BrandLockup compact={compactNav} />
          </motion.div>
          </Link>

          {!mobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsNavCollapsed((v) => !v)}
              className="text-muted-foreground hover:text-foreground"
              title={compactNav ? "Expand navigation" : "Collapse navigation"}
            >
              {compactNav ? <ChevronRight size={18} /> : <X size={18} className="rotate-45" />}
            </Button>
          )}
        </div>
      </div>

      {/* Coin Balance & Streak */}
      {compactNav ? (
        <div className="p-3 mx-2 mt-3 rounded-xl border border-border/60 bg-background/60 space-y-3">
          <div className="flex justify-center">
            <CoinBadge amount={wallet?.balance || 0} size="sm" />
          </div>
          <div className="flex items-center justify-center gap-1 text-xs">
            <Flame
              size={14}
              className={cn(
                isStreakActive ? "text-orange-400 animate-pulse" : "text-muted-foreground"
              )}
            />
            <span className={cn(
              "font-bold",
              isStreakActive ? "text-orange-400" : "text-muted-foreground"
            )}>
              {currentStreak}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 mx-4 mt-4 rounded-xl glass-card space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Your Balance</p>
            <CoinBadge amount={wallet?.balance || 0} size="lg" />
          </div>

          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Flame
                size={18}
                className={cn(
                  isStreakActive ? "text-orange-400 animate-pulse" : "text-muted-foreground"
                )}
              />
              <span className={cn(
                "font-bold",
                isStreakActive ? "text-orange-400" : "text-muted-foreground"
              )}>
                {currentStreak}
              </span>
              <span className="text-xs text-muted-foreground">
                day{currentStreak !== 1 ? 's' : ''} streak
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <Link key={item.id} to={item.path} onClick={() => setIsMobileOpen(false)}>
            <motion.div
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 group",
                compactNav ? "justify-center" : "gap-3",
                isActive(item.path)
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
              title={compactNav ? item.label : undefined}
            >
              <item.icon size={20} />
              {!compactNav && <span className="font-medium">{item.label}</span>}
              {!compactNav && isActive(item.path) && (
                <ChevronRight size={16} className="ml-auto" />
              )}
            </motion.div>
          </Link>
        ))}

        {/* Admin Link */}
        {isAdmin && (
          <Link to="/admin" onClick={() => setIsMobileOpen(false)}>
        <motion.div
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200",
            compactNav ? "justify-center" : "gap-3",
            isActive("/admin")
              ? "bg-primary/10 text-primary border border-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          )}
          title={compactNav ? "Admin Panel" : undefined}
        >
          <Shield size={20} />
          {!compactNav && <span className="font-medium">Admin Panel</span>}
          {!compactNav && isActive("/admin") && (
            <ChevronRight size={16} className="ml-auto" />
          )}
        </motion.div>
      </Link>
    )}
  </nav>

  {/* Bottom Navigation */}
  <div className="p-4 border-t border-sidebar-border space-y-3">
    <div className="flex items-center gap-2">
      {bottomItems.map((item) => (
        <Link key={item.id} to={item.path} onClick={() => setIsMobileOpen(false)} className="flex-1">
          <motion.div
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg transition-all duration-200",
              isActive(item.path)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
            title={item.label}
          >
            <item.icon size={20} />
            {!compactNav && <span className="font-medium">{item.label}</span>}
          </motion.div>
        </Link>
      ))}

      <Button
        variant="ghost"
        size="icon"
        onClick={handleSignOut}
        className="h-[46px] w-[46px] shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title="Sign Out"
      >
        <LogOut size={20} />
      </Button>
    </div>

    <div className={cn("rounded-lg border border-border/60 bg-background/60", compactNav ? "px-2 py-2 space-y-2" : "px-4 py-3 space-y-3")}>
      <div className="flex items-center justify-between">
        <div className={cn(compactNav && "hidden")}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Theme</p>
          <p className="text-xs text-foreground">Light / Dark</p>
        </div>
        <ThemeToggle />
      </div>
      <div className="flex items-center justify-between">
        {!compactNav && <p className="text-xs text-muted-foreground">Accent Color</p>}
        <AccentThemePicker />
      </div>
    </div>

  </div>
    </>
  );
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border z-50 flex items-center justify-between px-4">
        <Link to="/">
          <BrandLockup compact />
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Flame
              size={16}
              className={cn(
                isStreakActive ? "text-orange-400" : "text-muted-foreground"
              )}
            />
            <span className={cn(
              "text-sm font-bold",
              isStreakActive ? "text-orange-400" : "text-muted-foreground"
            )}>
              {currentStreak}
            </span>
          </div>

          <CoinBadge amount={wallet?.balance || 0} size="sm" />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(true)}
            className="text-foreground"
          >
            <Menu size={24} />
          </Button>
        </div>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="lg:hidden fixed left-0 top-0 h-screen w-72 bg-sidebar border-r border-sidebar-border flex flex-col z-50"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </Button>
            <SidebarContent mobile />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={cn(
          "hidden lg:flex fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex-col z-40 transition-all duration-200 overflow-x-hidden",
          isNavCollapsed ? "w-20" : "w-64"
        )}
      >
        <SidebarContent />
      </motion.aside>
    </>
  );
};
