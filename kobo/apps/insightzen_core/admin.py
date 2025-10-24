from __future__ import annotations

from django import forms
from django.contrib import admin, messages
from django.db import connection, transaction
from django.template.response import TemplateResponse
from django.urls import path
from django.utils.translation import gettext_lazy as _

from .models import (
    DoNotContactEntry,
    QuotaCell,
    QuotaFilter,
    QuotaScheme,
    SampleContact,
)


@admin.register(QuotaScheme)
class QuotaSchemeAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'status', 'is_default', 'priority', 'version')
    list_filter = ('status', 'is_default', 'project')
    search_fields = ('name', 'project__name', 'project__code')
    ordering = ('-is_default', '-priority', 'name')


@admin.register(QuotaCell)
class QuotaCellAdmin(admin.ModelAdmin):
    list_display = ('scheme', 'label', 'target', 'achieved', 'in_progress', 'reserved')
    list_filter = ('scheme',)
    search_fields = ('label', 'scheme__name')
    readonly_fields = ('updated_at', 'achieved', 'in_progress', 'reserved')


@admin.register(SampleContact)
class SampleContactAdmin(admin.ModelAdmin):
    list_display = (
        'project',
        'quota_cell',
        'phone_number',
        'status',
        'attempt_count',
        'last_attempt_at',
        'used_at',
    )
    list_filter = ('project', 'status', 'quota_cell')
    search_fields = ('phone_number', 'project__code', 'project__name')
    readonly_fields = (
        'attempt_count',
        'last_attempt_at',
        'used_at',
        'interviewer',
    )


@admin.register(DoNotContactEntry)
class DoNotContactEntryAdmin(admin.ModelAdmin):
    list_display = ('msisdn', 'reason', 'added_at')
    search_fields = ('msisdn',)
    ordering = ('-added_at',)


@admin.register(QuotaFilter)
class QuotaFilterAdmin(admin.ModelAdmin):
    list_display = ('quota_cell', 'created_at')
    search_fields = ('quota_cell__scheme__name',)
    list_filter = ('quota_cell__scheme',)
    readonly_fields = ('created_at',)


class BankSqlUploadForm(forms.Form):
    sql_file = forms.FileField(label=_('Bank SQL file (.sql)'))


def bank_upload_view(request):
    context = admin.site.each_context(request)
    if request.method == 'POST':
        form = BankSqlUploadForm(request.POST, request.FILES)
        if form.is_valid():
            uploaded_file = form.cleaned_data['sql_file']
            sql_bytes = uploaded_file.read()
            try:
                sql_text = sql_bytes.decode('utf-8')
            except UnicodeDecodeError:
                sql_text = sql_bytes.decode('latin-1')
            try:
                with transaction.atomic():
                    with connection.cursor() as cursor:
                        cursor.execute(sql_text)
                messages.success(request, _('Bank SQL script imported successfully.'))
                form = BankSqlUploadForm()
            except Exception as exc:  # noqa: BLE001
                messages.error(request, _('Failed to import SQL file: %(error)s') % {'error': exc})
    else:
        form = BankSqlUploadForm()
    context.update({'form': form, 'title': _('Upload Bank SQL dump')})
    return TemplateResponse(request, 'admin/insightzen_core/bank_upload.html', context)


def get_admin_urls(original_get_urls):
    def custom_urls():
        urls = original_get_urls()
        extra = [
            path('insightzen/bank-upload/', admin.site.admin_view(bank_upload_view), name='insightzen-bank-upload'),
        ]
        return extra + urls

    return custom_urls


admin.site.get_urls = get_admin_urls(admin.site.get_urls)
