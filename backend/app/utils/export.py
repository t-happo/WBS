import csv
import io
from typing import List, Dict, Any, Optional
from datetime import datetime
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os


class DataExporter:
    """データエクスポート用のユーティリティクラス"""
    
    @staticmethod
    def to_csv(data: List[Dict[str, Any]], filename: Optional[str] = None) -> io.StringIO:
        """データをCSV形式でエクスポート"""
        if not data:
            raise ValueError("エクスポートするデータがありません")
        
        output = io.StringIO()
        fieldnames = data[0].keys()
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
        output.seek(0)
        return output
    
    @staticmethod
    def to_excel(data: List[Dict[str, Any]], sheet_name: str = "データ") -> io.BytesIO:
        """データをExcel形式でエクスポート"""
        if not data:
            raise ValueError("エクスポートするデータがありません")
        
        df = pd.DataFrame(data)
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            # スタイリング
            worksheet = writer.sheets[sheet_name]
            for column in worksheet.columns:
                max_length = 0
                column_name = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[column_name].width = adjusted_width
        
        output.seek(0)
        return output
    
    @staticmethod
    def to_pdf(data: List[Dict[str, Any]], title: str = "レポート", filename: Optional[str] = None) -> io.BytesIO:
        """データをPDF形式でエクスポート"""
        if not data:
            raise ValueError("エクスポートするデータがありません")
        
        output = io.BytesIO()
        doc = SimpleDocTemplate(
            output, 
            pagesize=landscape(A4),
            rightMargin=72, 
            leftMargin=72,
            topMargin=72, 
            bottomMargin=18
        )
        
        # スタイル設定
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        
        # コンテンツ構築
        story = []
        
        # タイトル
        story.append(Paragraph(title, title_style))
        story.append(Spacer(1, 12))
        
        # 日時
        current_time = datetime.now().strftime('%Y年%m月%d日 %H:%M:%S')
        story.append(Paragraph(f"作成日時: {current_time}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # テーブルデータ準備
        if data:
            headers = list(data[0].keys())
            table_data = [headers]
            
            for row in data:
                table_data.append([str(row.get(header, '')) for header in headers])
            
            # テーブル作成
            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(table)
        
        # PDF生成
        doc.build(story)
        output.seek(0)
        return output


class ProjectExporter:
    """プロジェクト関連のエクスポート機能"""
    
    @staticmethod
    def format_project_data(projects: List, tasks_by_project: Dict = None) -> List[Dict[str, Any]]:
        """プロジェクトデータをエクスポート用にフォーマット"""
        formatted_data = []
        
        for project in projects:
            # プロジェクトのタスク統計を計算
            if tasks_by_project and project.id in tasks_by_project:
                tasks = tasks_by_project[project.id]
                total_tasks = len(tasks)
                completed_tasks = len([t for t in tasks if t.status == 'completed'])
                progress = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
            else:
                total_tasks = 0
                completed_tasks = 0
                progress = 0
            
            formatted_data.append({
                'プロジェクト名': project.name,
                'ステータス': DataExporter._translate_status(project.status),
                '説明': project.description or '',
                '総タスク数': total_tasks,
                '完了タスク数': completed_tasks,
                '進捗率(%)': progress,
                '作成日': project.created_at.strftime('%Y-%m-%d') if project.created_at else '',
                '更新日': project.updated_at.strftime('%Y-%m-%d') if project.updated_at else '',
            })
        
        return formatted_data
    
    @staticmethod
    def format_task_data(tasks: List, include_project_name: bool = True) -> List[Dict[str, Any]]:
        """タスクデータをエクスポート用にフォーマット"""
        formatted_data = []
        
        for task in tasks:
            task_data = {
                'タスク名': task.name,
                'タイプ': DataExporter._translate_task_type(task.task_type),
                'ステータス': DataExporter._translate_status(task.status),
                '優先度': DataExporter._translate_priority(task.priority),
                '予定工数(h)': task.estimated_hours or 0,
                '実績工数(h)': task.actual_hours or 0,
                '進捗率(%)': task.progress_percentage or 0,
                '開始予定日': task.planned_start_date.strftime('%Y-%m-%d') if task.planned_start_date else '',
                '終了予定日': task.planned_end_date.strftime('%Y-%m-%d') if task.planned_end_date else '',
                '実開始日': task.actual_start_date.strftime('%Y-%m-%d') if task.actual_start_date else '',
                '実終了日': task.actual_end_date.strftime('%Y-%m-%d') if task.actual_end_date else '',
                'WBSコード': task.wbs_code or '',
                '説明': task.description or '',
            }
            
            if include_project_name and hasattr(task, 'project'):
                task_data['プロジェクト名'] = task.project.name
            
            formatted_data.append(task_data)
        
        return formatted_data
    
    @staticmethod
    def _translate_status(status: str) -> str:
        """ステータスを日本語に変換"""
        status_map = {
            'planning': '計画中',
            'active': '進行中',
            'on_hold': '保留',
            'completed': '完了',
            'cancelled': 'キャンセル',
            'not_started': '未開始',
            'in_progress': '進行中',
            'review': 'レビュー中',
        }
        return status_map.get(status, status)
    
    @staticmethod
    def _translate_task_type(task_type: str) -> str:
        """タスクタイプを日本語に変換"""
        type_map = {
            'phase': 'フェーズ',
            'task': 'タスク',
            'subtask': 'サブタスク',
        }
        return type_map.get(task_type, task_type)
    
    @staticmethod
    def _translate_priority(priority) -> str:
        """優先度を日本語に変換"""
        if isinstance(priority, int):
            priority_map = {
                1: '最低',
                2: '低',
                3: '中',
                4: '高',
                5: '最高',
            }
            return priority_map.get(priority, '中')
        return str(priority)


# エクスポート機能をDataExporterクラスに追加
DataExporter._translate_status = ProjectExporter._translate_status
DataExporter._translate_task_type = ProjectExporter._translate_task_type  
DataExporter._translate_priority = ProjectExporter._translate_priority