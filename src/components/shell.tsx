// Signed-in app frame: sidebar (tablet landscape / iPad / desktop), drawer + bottom tabs (phones), top bar.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, BackHandler, Image, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWR from "swr";
import {
  Activity,
  BarChart3,
  Bell,
  Check,
  CreditCard,
  Database,
  Gauge,
  Globe,
  IndianRupee,
  Landmark,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Megaphone,
  Menu,
  MoreHorizontal,
  Palette,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { timeAgo, initials } from "@/lib/format";
import type { Permission } from "@/shared/permissions";
import { Badge, IconButton, MenuItem, Popover, Text, THEMES, useBreakpoint, useTheme, useThemeCtl, useToast } from "@/ui";
import { useAuth, useSession } from "./session";
import { useRealtime } from "./realtime";
import { useAngelOptional } from "./angel/angel-provider";
import { AngelOrb } from "./angel/orb";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  perm?: Permission;
}

const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: "finance.read" },
  { href: "/income", label: "Income", icon: TrendingUp, perm: "income.view" },
  { href: "/expenses", label: "Expenses", icon: TrendingDown, perm: "expense.view" },
  { href: "/budgets", label: "Budgets", icon: Wallet, perm: "expense.view" },
  { href: "/debts", label: "Debts & EMIs", icon: Landmark, perm: "debt.view" },
  { href: "/goals", label: "Savings goals", icon: Target, perm: "goal.view" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, perm: "reports.view" },
  { href: "/insights", label: "Angel suggestions", icon: Lightbulb, perm: "insights.view" },
  { href: "/notifications", label: "Notifications", icon: Bell, perm: "notifications.read" },
];
const ACCOUNT_NAV: NavItem[] = [
  { href: "/plan", label: "Plan & billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];
const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Admin overview", icon: Gauge, perm: "users.view" },
  { href: "/admin/users", label: "Users", icon: Users, perm: "users.view" },
  { href: "/admin/payments", label: "Payments", icon: IndianRupee, perm: "users.view" },
  { href: "/admin/visitors", label: "Visitors (live)", icon: Globe, perm: "users.view" },
  { href: "/admin/database", label: "Database", icon: Database, perm: "database.view" },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, perm: "audit.view" },
  { href: "/admin/notifications", label: "Broadcast", icon: Megaphone, perm: "admin.notifications.send" },
  { href: "/admin/settings", label: "System settings", icon: SlidersHorizontal, perm: "database.view" },
];

/** Top-level sections replace each other (no endless back-stack); details use router.push. */
export function go(href: string) {
  router.replace(href as never);
}

function Logo({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel="Budget Pro" onPress={onPress ?? (() => go("/dashboard"))} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8 }}>
      <Image source={require("../../assets/icon.png")} style={{ width: 30, height: 30, borderRadius: 8 }} />
      <Text size="md" weight="semibold" tight>
        Budget Pro
      </Text>
    </Pressable>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTheme();
  const pathname = usePathname();
  const { can, isAdmin } = useSession();
  const { data } = useSWR<{ unread: number }>(can("notifications.read") ? "/api/notifications?limit=1" : null);
  const visible = (items: NavItem[]) => items.filter((i) => !i.perm || can(i.perm));

  const render = (items: NavItem[]) =>
    visible(items).map((item) => {
      const Icon = item.icon;
      const active = isActive(pathname, item.href);
      return (
        <Pressable
          key={item.href}
          accessibilityRole="link"
          accessibilityState={{ selected: active }}
          onPress={() => {
            onNavigate?.();
            go(item.href);
          }}
          style={(s) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 10,
            backgroundColor: active ? t.a("primary", 0.12) : (s as { hovered?: boolean }).hovered || s.pressed ? t.c.surface2 : "transparent",
          })}
        >
          <Icon size={17} color={active ? t.c.primary : t.c.muted} />
          <Text size="sm" weight={active ? "medium" : "regular"} color={active ? "fg" : "muted"} style={{ flex: 1 }} numberOfLines={1}>
            {item.label}
          </Text>
          {item.href === "/notifications" && data?.unread ? (
            <View style={{ minWidth: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: t.c.primary, alignItems: "center" }}>
              <Text size="2xs" weight="semibold" style={{ color: t.c.primaryFg }}>
                {data.unread > 99 ? "99+" : data.unread}
              </Text>
            </View>
          ) : null}
        </Pressable>
      );
    });

  const adminItems = isAdmin ? visible(ADMIN_NAV) : [];
  const section = (label: string, icon?: ReactNode) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, marginTop: 20, marginBottom: 4 }}>
      {icon}
      <Text size="2xs" weight="semibold" color="muted" uppercase>
        {label}
      </Text>
    </View>
  );
  return (
    <View style={{ gap: 2 }}>
      <AngelNavItem onNavigate={onNavigate} />
      {render(MAIN_NAV)}
      {section("Account")}
      {render(ACCOUNT_NAV)}
      {adminItems.length ? (
        <>
          {section("Admin", <ShieldCheck size={12} color={t.c.muted} />)}
          {render(ADMIN_NAV)}
        </>
      ) : null}
    </View>
  );
}

function AngelNavItem({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTheme();
  const angel = useAngelOptional();
  if (!angel?.eligible) return null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        onNavigate?.();
        angel.setOpen(true);
      }}
      style={(s) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: t.a("primary", 0.25),
        backgroundColor: angel.open ? t.a("primary", 0.14) : (s as { hovered?: boolean }).hovered || s.pressed ? t.a("primary", 0.1) : t.a("primary", 0.06),
      })}
    >
      <AngelOrb size={22} state={angel.mode === "wake" ? "wake" : "idle"} halo={false} />
      <Text size="sm" weight="medium" style={{ flex: 1 }}>
        Angel AI
      </Text>
      {angel.mode === "wake" ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.c.success }} /> : null}
    </Pressable>
  );
}

function LiveIndicator() {
  const t = useTheme();
  const { mode } = useRealtime();
  const color = mode === "live" ? t.c.success : mode === "connecting" ? t.c.warning : t.c.danger;
  return (
    <View accessibilityLabel={`Realtime ${mode}`} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, borderWidth: 1, borderColor: t.c.border, paddingHorizontal: 10, paddingVertical: 4 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text size="2xs" color="muted">
        {mode === "live" ? "Live" : mode === "connecting" ? "Connecting" : "Offline"}
      </Text>
    </View>
  );
}

function ThemeMenu() {
  const t = useTheme();
  const { themeId, setTheme } = useThemeCtl();
  const { can } = useSession();
  return (
    <Popover width={210} trigger={(open) => <IconButton icon={Palette} label="Change theme" onPress={open} />}>
      {(close) =>
        THEMES.map((th) => (
          <MenuItem
            key={th.id}
            active={themeId === th.id}
            onPress={() => {
              setTheme(th.id);
              close();
              if (can("settings.write")) void api("/api/auth/me", { method: "PATCH", body: { theme: th.id } }).catch(() => {});
            }}
          >
            <View style={{ flexDirection: "row", width: 26, height: 16, borderRadius: 4, overflow: "hidden", borderWidth: 1, borderColor: t.c.border }}>
              <View style={{ flex: 1, backgroundColor: th.swatch[0] }} />
              <View style={{ flex: 1, backgroundColor: th.swatch[1] }} />
            </View>
            <Text size="sm" style={{ flex: 1 }}>
              {th.name}
            </Text>
            {themeId === th.id ? <Check size={14} color={t.c.primary} /> : null}
          </MenuItem>
        ))
      }
    </Popover>
  );
}

interface NotifItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link: string | null;
}

function BellMenu() {
  const t = useTheme();
  const { can } = useSession();
  const { data, mutate } = useSWR<{ items: NotifItem[]; unread: number }>(can("notifications.read") ? "/api/notifications?limit=6" : null);
  if (!can("notifications.read")) return null;
  const unread = data?.unread ?? 0;
  return (
    <Popover width={340} trigger={(open) => <IconButton icon={Bell} label={`Notifications (${unread} unread)`} onPress={open} badge={unread > 0} />}>
      {(close) => (
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 8 }}>
            <Text size="sm" weight="semibold">
              Notifications
            </Text>
            {unread > 0 && can("notifications.manage") ? (
              <Text
                size="xs"
                color="primary"
                onPress={async () => {
                  await api("/api/notifications", { method: "PATCH" }).catch(() => {});
                  void mutate();
                }}
              >
                Mark all read
              </Text>
            ) : null}
          </View>
          <ScrollView style={{ maxHeight: 320 }}>
            {!data?.items.length ? (
              <Text size="sm" color="muted" center style={{ paddingVertical: 28 }}>
                You&apos;re all caught up.
              </Text>
            ) : (
              data.items.map((n) => (
                <MenuItem
                  key={n.id}
                  onPress={() => {
                    close();
                    if (!n.read && can("notifications.manage")) void api(`/api/notifications/${n.id}`, { method: "PATCH" }).then(() => mutate()).catch(() => {});
                    router.push((n.link || "/notifications") as never);
                  }}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, alignSelf: "flex-start", marginTop: 6, backgroundColor: n.read ? "transparent" : t.c.primary }} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" weight="medium" numberOfLines={1}>
                      {n.title}
                    </Text>
                    <Text size="xs" color="muted" numberOfLines={2}>
                      {n.message}
                    </Text>
                    <Text size="2xs" color="muted" style={{ marginTop: 2 }}>
                      {timeAgo(n.createdAt)}
                    </Text>
                  </View>
                </MenuItem>
              ))
            )}
          </ScrollView>
          <MenuItem
            onPress={() => {
              close();
              go("/notifications");
            }}
          >
            <Text size="xs" weight="medium" color="primary" center style={{ flex: 1 }}>
              View all
            </Text>
          </MenuItem>
        </View>
      )}
    </Popover>
  );
}

function UserMenu() {
  const t = useTheme();
  const bp = useBreakpoint();
  const { user } = useSession();
  const { signOut } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Popover
      width={250}
      trigger={(open) => (
        <Pressable accessibilityRole="button" accessibilityLabel="Account menu" onPress={open} style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 4, paddingRight: bp.sm ? 8 : 4, borderRadius: 10 }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.a("primary", 0.16), alignItems: "center", justifyContent: "center" }}>
            <Text size="2xs" weight="semibold" color="primary">
              {initials(user.name)}
            </Text>
          </View>
          {bp.sm ? (
            <Text size="sm" numberOfLines={1} style={{ maxWidth: 120 }}>
              {user.name.split(" ")[0]}
            </Text>
          ) : null}
        </Pressable>
      )}
    >
      {(close) => (
        <View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
            <Text size="sm" weight="medium" numberOfLines={1}>
              {user.name}
            </Text>
            <Text size="xs" color="muted" numberOfLines={1}>
              {user.email}
            </Text>
            <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
              <Badge tone="primary">{user.plan.toUpperCase()}</Badge>
              {user.role === "admin" ? <Badge tone="warning">ADMIN</Badge> : null}
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: t.c.border, marginVertical: 4 }} />
          <MenuItem
            onPress={() => {
              close();
              go("/settings");
            }}
          >
            <Settings size={16} color={t.c.muted} />
            <Text size="sm">Settings</Text>
          </MenuItem>
          <MenuItem
            onPress={() => {
              close();
              go("/plan");
            }}
          >
            <CreditCard size={16} color={t.c.muted} />
            <Text size="sm">Plan & usage</Text>
          </MenuItem>
          <MenuItem
            danger
            onPress={async () => {
              if (busy) return;
              setBusy(true);
              close();
              try {
                await signOut();
              } catch {
                toast.error("Could not sign out", "Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <LogOut size={16} color={t.c.danger} />
            <Text size="sm" color="danger">
              {busy ? "Signing out…" : "Sign out"}
            </Text>
          </MenuItem>
        </View>
      )}
    </Popover>
  );
}

function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const x = useRef(new Animated.Value(-320)).current;
  const [visible, setVisible] = useState(open);
  useEffect(() => {
    if (open) {
      setVisible(true);
      Animated.timing(x, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== "web" }).start();
    } else {
      Animated.timing(x, { toValue: -320, duration: 160, useNativeDriver: Platform.OS !== "web" }).start(() => setVisible(false));
    }
  }, [open, x]);
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <Pressable accessibilityLabel="Close menu" onPress={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)" }} />
        <Animated.View style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 300, maxWidth: "84%", transform: [{ translateX: x }], backgroundColor: t.c.surface, borderRightWidth: 1, borderRightColor: t.c.border, paddingTop: insets.top + 14, paddingBottom: insets.bottom + 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 }}>
            <Logo
              onPress={() => {
                onClose();
                go("/dashboard");
              }}
            />
            <IconButton icon={X} label="Close menu" onPress={onClose} />
          </View>
          <ScrollView style={{ marginTop: 16 }} contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 24 }}>
            <NavLinks onNavigate={onClose} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function BottomNav({ onMore }: { onMore: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { can } = useSession();
  const items = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard, perm: "finance.read" as Permission },
    { href: "/expenses", label: "Expenses", icon: TrendingDown, perm: "expense.view" as Permission },
    { href: "/income", label: "Income", icon: TrendingUp, perm: "income.view" as Permission },
    { href: "/analytics", label: "Analytics", icon: Activity, perm: "reports.view" as Permission },
  ].filter((b) => can(b.perm));
  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", borderTopWidth: 1, borderTopColor: t.c.border, backgroundColor: t.a("surface", 0.97), paddingBottom: insets.bottom }}>
      {items.map((b) => {
        const Icon = b.icon;
        const active = pathname === b.href;
        return (
          <Pressable key={b.href} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => go(b.href)} style={{ flex: 1, alignItems: "center", gap: 3, paddingVertical: 9 }}>
            <Icon size={21} color={active ? t.c.primary : t.c.muted} />
            <Text size="2xs" weight={active ? "medium" : "regular"} color={active ? "primary" : "muted"}>
              {b.label}
            </Text>
          </Pressable>
        );
      })}
      <Pressable accessibilityRole="button" accessibilityLabel="More" onPress={onMore} style={{ flex: 1, alignItems: "center", gap: 3, paddingVertical: 9 }}>
        <MoreHorizontal size={21} color={t.c.muted} />
        <Text size="2xs" color="muted">
          More
        </Text>
      </Pressable>
    </View>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTheme();
  const bp = useBreakpoint();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  useEffect(() => setDrawer(false), [pathname]);

  // Android back button: top-level sections go back to the dashboard before leaving the app
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (drawer) {
        setDrawer(false);
        return true;
      }
      if (router.canGoBack()) return false;
      if (pathname !== "/dashboard") {
        go("/dashboard");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [pathname, drawer]);

  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: t.c.bg }}>
      {!bp.compact ? (
        <View style={{ width: 260, borderRightWidth: 1, borderRightColor: t.c.border, backgroundColor: t.a("surface", 0.6), paddingTop: insets.top + 20, paddingBottom: 12 }}>
          <View style={{ paddingHorizontal: 12 }}>
            <Logo />
          </View>
          <ScrollView style={{ flex: 1, marginTop: 22 }} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16 }}>
            <NavLinks />
          </ScrollView>
          <Text size="2xs" color="muted" style={{ paddingHorizontal: 22, paddingTop: 8 }}>
            © {new Date().getFullYear()} Budget Pro
          </Text>
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <View style={{ paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: t.c.border, backgroundColor: t.a("bg", 0.92) }}>
          <View style={{ height: 56, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: bp.sm ? 20 : 10 }}>
            {bp.compact ? (
              <>
                <IconButton icon={Menu} label="Open menu" onPress={() => setDrawer(true)} />
                <Pressable onPress={() => go("/dashboard")}>
                  <Text size="md" weight="semibold" tight>
                    Budget Pro
                  </Text>
                </Pressable>
              </>
            ) : null}
            <View style={{ flex: 1 }} />
            {bp.sm ? <LiveIndicator /> : null}
            <ThemeMenu />
            <BellMenu />
            <UserMenu />
          </View>
        </View>
        <View style={{ flex: 1 }}>{children}</View>
        {bp.compact ? <BottomNav onMore={() => setDrawer(true)} /> : null}
      </View>
      {bp.compact ? <Drawer open={drawer} onClose={() => setDrawer(false)} /> : null}
    </View>
  );
}
