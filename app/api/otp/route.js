import { NextResponse } from 'next/server';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

export async function POST(req) {
    const { user, password } = await req.json();

    if (!user || !password) {
        return NextResponse.json({ message: 'Thiếu tài khoản hoặc mật khẩu' }, { status: 400 });
    }

    const config = {
        imap: {
            user: user,
            password: password,
            host: 'imap-mail.outlook.com',
            port: 993,
            tls: true,
            authTimeout: 5000, // Tăng thời gian chờ
            tlsOptions: { rejectUnauthorized: false } // Chấp nhận các chứng chỉ không hợp lệ
        }
    };

    let connection;

    try {
        console.log("Kết nối đến máy chủ IMAP với user:", user);
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [['FROM', 'noreply@telegram.org']];
        const fetchOptions = {
            bodies: [''],
            markSeen: true
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        let otpCode = null;

        // Duyệt qua các email từ mới nhất đến cũ nhất
        for (const item of messages.reverse()) {
            const allParts = item.parts;

            for (const part of allParts) {
                // Phân tích và kiểm tra toàn bộ phần nội dung của email
                const mail = await simpleParser(part.body);
                
                // Kiểm tra cả nội dung text và html
                const body = mail.text + mail.html; // Gộp cả nội dung văn bản và HTML
                console.log("Nội dung phần email:", body);

                // Tìm mã OTP trong nội dung email
                const otpMatch = body && body.match(/Your code is: (\d{6})/);
                if (otpMatch) {
                    otpCode = otpMatch[1];
                    break; // Dừng lại khi tìm thấy OTP
                }
            }

            if (otpCode) break; // Dừng lại khi tìm thấy OTP trong email mới nhất
        }

        if (otpCode) {
            return NextResponse.json({ otp: otpCode }, { status: 200 });
        } else {
            console.log(`Không tìm thấy OTP trong email. User: ${user}`);
            return NextResponse.json({ 
                otp: `000000`, 
            }, { status: 404 });
        }
    } catch (error) {
        console.error("Lỗi trong quá trình kết nối:", error);
        const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
        return NextResponse.json({ otp: `000000`, errorMessage }, { status: 500 });
    } finally {
        if (connection) {
            connection.end();
        }
    }
}
