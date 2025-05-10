import { supabase } from "../db/db.js";

const handleSupabaseStats = async (req, res) => {
    try {
        const { table, count, query } = req.body;
        if (!table) {
          return res.status(400).json({
            error: "Table name is required"
          });
        }
        if (count) {
          const { data, error, count: totalCount } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          if (error) throw error;
          
          return res.json({ count: totalCount });
        }
        return res.status(400).json({
          error: "Invalid query parameters"
        });
      } catch (error) {
        console.error(`Stats API error:`, error);
        res.status(500).json({
          error: "Failed to fetch statistics",
          details: error.message
        });
      }
}

const handleUserStats = async (req, res) => {
      try {
        const { data, error, count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        res.json({ count });
      } catch (error) {
        console.error("Error fetching user stats:", error);
        res.status(500).json({
          error: "Failed to fetch user statistics",
          details: error.message
        });
      }
}

const handleSessionStat = async (req, res) => {
    try {
        const { data, error, count } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        res.json({ count });
      } catch (error) {
        console.error("Error fetching session stats:", error);
        res.status(500).json({
          error: "Failed to fetch session statistics",
          details: error.message
        });
      }
}

const handleMessagesStat = async (req, res) => {
      try {
        const { data, error, count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        res.json({ count });
      } catch (error) {
        console.error("Error fetching message stats:", error);
        res.status(500).json({
          error: "Failed to fetch message statistics",
          details: error.message
        });
      }
}

const handleQAStat = async (req, res) => {
      try {
    const { data, error, count } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    res.json({ count });
  } catch (error) {
    console.error("Error fetching QA entry stats:", error);
    res.status(500).json({
      error: "Failed to fetch QA entries statistics",
      details: error.message
    });
  }
}

const handleActivityStat = async (req, res) => {
    try {
    // 1. Calculate date range
    const dateRange = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      dateRange.push(date.toISOString().split('T')[0]);
    }

    // 2. Fetch data from Supabase
    const [sessions, messages] = await Promise.all([
      supabase
        .from('sessions')
        .select('created_at')
        .gte('created_at', dateRange[0])
        .lte('created_at', dateRange[dateRange.length - 1]),
      supabase
        .from('messages')
        .select('created_at')
        .gte('created_at', dateRange[0])
        .lte('created_at', dateRange[dateRange.length - 1])
    ]);

    if (sessions.error || messages.error) {
      throw new Error('Database error');
    }

    // 3. Process data
    const countByDay = (data, range) => {
      const counts = Array(range.length).fill(0);
      data.forEach(item => {
        const date = new Date(item.created_at).toISOString().split('T')[0];
        const index = range.indexOf(date);
        if (index !== -1) counts[index]++;
      });
      return counts;
    };

    // 4. Return processed data
    res.json({
      sessionsCount: countByDay(sessions.data, dateRange),
      messagesCount: countByDay(messages.data, dateRange)
    });

  } catch (error) {
    console.error('Activity data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }

}

export{handleSupabaseStats, handleUserStats, handleSessionStat, handleMessagesStat, handleQAStat, handleActivityStat};
