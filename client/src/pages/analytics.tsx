import { useEffect, useState } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { motion } from "framer-motion";
import { 
  Users, FileText, Calendar, MessageSquare, Building, CreditCard, 
  TrendingUp, TrendingDown, Loader2, BarChart3, PieChart as PieIcon
} from "lucide-react";

interface Analytics {
  totalUsers: number;
  premiumUsers: number;
  totalPosts: number;
  totalBookings: number;
  totalMessages: number;
  totalPlaces: number;
  usersByMonth: { month: string; count: number }[];
  postsByCity: { city: string; count: number }[];
  bookingsByStatus: { status: string; count: number }[];
  recentActivity: { date: string; users: number; posts: number; bookings: number }[];
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

function AnimatedCounter({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const incrementTime = duration / end;
    
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) clearInterval(timer);
    }, Math.max(incrementTime, 10));

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}</span>;
}

export default function Analytics() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setLocation("/auth");
      return;
    }

    fetch("/api/analytics", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setAnalytics(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, authLoading, setLocation]);

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center animate-pulse">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!analytics) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Failed to load analytics</p>
        </div>
      </Layout>
    );
  }

  const conversionRate = analytics.totalUsers > 0 
    ? ((analytics.premiumUsers / analytics.totalUsers) * 100).toFixed(1)
    : "0";

  const mrr = analytics.premiumUsers * 29;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-display font-black text-white tracking-tight">Analytics Dashboard</h1>
          <p className="text-slate-400 mt-1">Real-time insights for NomadLife</p>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KPICard
            title="Total Users"
            value={analytics.totalUsers}
            icon={Users}
            color="from-violet-500 to-purple-600"
            delay={0}
          />
          <KPICard
            title="Premium Users"
            value={analytics.premiumUsers}
            icon={CreditCard}
            color="from-amber-500 to-orange-600"
            delay={0.1}
          />
          <KPICard
            title="Total Posts"
            value={analytics.totalPosts}
            icon={FileText}
            color="from-cyan-500 to-blue-600"
            delay={0.2}
          />
          <KPICard
            title="Bookings"
            value={analytics.totalBookings}
            icon={Calendar}
            color="from-emerald-500 to-teal-600"
            delay={0.3}
          />
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white"
          >
            <p className="text-green-100 text-sm font-medium">Monthly Revenue (MRR)</p>
            <p className="text-4xl font-display font-black mt-2">
              $<AnimatedCounter value={mrr} />
            </p>
            <div className="flex items-center gap-1 mt-2 text-green-100 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>+12.5% from last month</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white"
          >
            <p className="text-violet-100 text-sm font-medium">Conversion Rate</p>
            <p className="text-4xl font-display font-black mt-2">{conversionRate}%</p>
            <div className="flex items-center gap-1 mt-2 text-violet-100 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>Premium conversions</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 text-white"
          >
            <p className="text-cyan-100 text-sm font-medium">Messages Sent</p>
            <p className="text-4xl font-display font-black mt-2">
              <AnimatedCounter value={analytics.totalMessages} />
            </p>
            <div className="flex items-center gap-1 mt-2 text-cyan-100 text-sm">
              <MessageSquare className="w-4 h-4" />
              <span>Community engagement</span>
            </div>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Activity Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-400" />
              Weekly Activity
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={analytics.recentActivity}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '12px',
                    color: '#fff'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#8b5cf6" 
                  fillOpacity={1} 
                  fill="url(#colorUsers)" 
                  strokeWidth={2}
                  animationDuration={1500}
                />
                <Area 
                  type="monotone" 
                  dataKey="posts" 
                  stroke="#06b6d4" 
                  fillOpacity={1} 
                  fill="url(#colorPosts)" 
                  strokeWidth={2}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Posts by City */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Posts by Location
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.postsByCity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                <YAxis dataKey="city" type="category" stroke="#9ca3af" fontSize={12} width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '12px',
                    color: '#fff'
                  }} 
                />
                <Bar 
                  dataKey="count" 
                  fill="#06b6d4" 
                  radius={[0, 8, 8, 0]}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Booking Status Pie */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 }}
            className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-amber-400" />
              Booking Status
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={analytics.bookingsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  animationDuration={1500}
                >
                  {analytics.bookingsByStatus.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '12px',
                    color: '#fff'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {analytics.bookingsByStatus.map((item, index) => (
                <div key={item.status} className="flex items-center gap-1 text-xs text-slate-400">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  {item.status}: {item.count}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Platform Stats */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.0 }}
            className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 lg:col-span-2"
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-400" />
              Platform Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatItem label="Places Listed" value={analytics.totalPlaces} icon={Building} />
              <StatItem label="Active Chats" value={analytics.totalMessages} icon={MessageSquare} />
              <StatItem label="Avg. Posts/User" value={analytics.totalUsers > 0 ? (analytics.totalPosts / analytics.totalUsers).toFixed(1) : "0"} icon={FileText} />
              <StatItem label="Engagement" value="87%" icon={TrendingUp} />
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}

function KPICard({ title, value, icon: Icon, color, delay }: { 
  title: string; 
  value: number; 
  icon: any; 
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-display font-black text-white">
        <AnimatedCounter value={value} />
      </p>
      <p className="text-xs text-slate-400 mt-1">{title}</p>
    </motion.div>
  );
}

function StatItem({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="text-center p-3 bg-slate-900/50 rounded-xl">
      <Icon className="w-5 h-5 text-slate-400 mx-auto mb-2" />
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}
