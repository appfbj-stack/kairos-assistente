"use client";

import { Menu, RefreshCw, Search, Bell, MoreVertical } from "lucide-react";

interface TopBarProps {
    title: string;
    onMenuClick: () => void;
    onRefresh?: () => void;
    actions?: React.ReactNode;
}

export default function TopBar({ title, onMenuClick, onRefresh, actions }: TopBarProps) {
    return (
          <header
                  className="flex items-center px-5 py-3 sticky top-0 z-20"
                  style={{
                            background: "#07071a",
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                            minHeight: "56px",
                  }}
                >
            {/* Mobile menu button */}
                <button
                          onClick={onMenuClick}
                          className="btn-icon-ghost lg:hidden mr-3"
                        >
                        <Menu size={18} />
                </button>button>
          
            {/* Title */}
                <h1 className="text-[15px] font-semibold text-white flex-1">{title}</h1>h1>
          
            {/* Right actions */}
                <div className="flex items-center gap-1">
                  {actions}
                
                        <button className="btn-icon-ghost">
                                  <Search size={17} />
                        </button>button>
                
                        <div className="relative">
                                  <button className="btn-icon-ghost">
                                              <Bell size={17} />
                                  </button>button>
                                  <span className="badge-notif">3</span>span>
                        </div>div>
                
                  {onRefresh && (
                            <button
                                          onClick={onRefresh}
                                          className="btn-icon-ghost"
                                          title="Atualizar"
                                        >
                                        <RefreshCw size={16} />
                            </button>button>
                        )}
                
                        <button className="btn-icon-ghost">
                                  <MoreVertical size={17} />
                        </button>button>
                </div>div>
          </header>header>
        );
}</header>
