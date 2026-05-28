import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import FileUpload from './FileUpload';
import FileList from './FileList';
import DocumentViewer from './DocumentViewer';
import CompareView from './CompareView';
import DetectionPanel from './DetectionPanel';
import RuleConfig from './RuleConfig';
import DesensitizeToolbar from './DesensitizeToolbar';
import ExportDialog from './ExportDialog';
import OperationLog from './OperationLog';
import { useAppStore } from '../store/useAppStore';
import { CompareMode } from '../types';

const DRAWER_WIDTH_LEFT = 280;
const DRAWER_WIDTH_RIGHT = 360;

const Layout: React.FC = () => {
  const snackbarMessage = useAppStore((s) => s.snackbarMessage);
  const hideSnackbar = useAppStore((s) => s.hideSnackbar);
  const compareMode = useAppStore((s) => s.compareMode);
  const rightPanelTab = useAppStore((s) => s.rightPanelTab);
  const setRightPanelTab = useAppStore((s) => s.setRightPanelTab);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#f0f4f8' }}>
      {/* 顶部导航栏 */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: '#243b53',
        }}
      >
        <Toolbar variant="dense">
          <SecurityIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
            审计文档智能脱敏可视化工具
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" color="rgba(255,255,255,0.7)">
            所有处理均在本地完成，数据不会上传至服务器
          </Typography>
        </Toolbar>
      </AppBar>

      {/* 工具栏 */}
      <Box sx={{ mt: '48px' }}>
        <DesensitizeToolbar />
      </Box>

      {/* 主体区域 */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左侧 - 文件列表 */}
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH_LEFT,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH_LEFT,
              boxSizing: 'border-box',
              top: '48px',
              height: 'calc(100% - 48px)',
            },
          }}
          anchor="left"
        >
          <Box sx={{ p: 2 }}>
            <FileUpload />
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
            <FileList />
          </Box>
        </Drawer>

        {/* 中间 - 主工作区 */}
        <Box
          sx={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            ml: `${DRAWER_WIDTH_LEFT}px`,
            mr: `${DRAWER_WIDTH_RIGHT}px`,
          }}
        >
          {compareMode === CompareMode.SPLIT ? (
            <CompareView />
          ) : (
            <DocumentViewer />
          )}
        </Box>

        {/* 右侧 - 配置面板 */}
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH_RIGHT,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH_RIGHT,
              boxSizing: 'border-box',
              top: '48px',
              height: 'calc(100% - 48px)',
            },
          }}
          anchor="right"
        >
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={rightPanelTab}
              onChange={(_, val) => setRightPanelTab(val)}
              variant="fullWidth"
              sx={{ minHeight: 40 }}
            >
              <Tab label="检测" sx={{ minHeight: 40, py: 0 }} />
              <Tab label="规则" sx={{ minHeight: 40, py: 0 }} />
              <Tab label="日志" sx={{ minHeight: 40, py: 0 }} />
            </Tabs>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {rightPanelTab === 0 && <DetectionPanel />}
            {rightPanelTab === 1 && <RuleConfig />}
            {rightPanelTab === 2 && <OperationLog />}
          </Box>
        </Drawer>
      </Box>

      {/* 导出对话框 */}
      <ExportDialog />

      {/* Snackbar 消息提示 */}
      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={3000}
        onClose={hideSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={hideSnackbar} severity="info" variant="filled" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Layout;
