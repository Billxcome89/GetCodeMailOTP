import { NextResponse } from 'next/server';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import tunnel from 'tunnel';

export async function POST(req) {
    console.log("Đã nhận được yêu cầu POST");

    const { user, password } = await req.json();

    console.log("Payload nhận được:", { user, password });

    if (!user || !password) {
        console.log("Thiếu tài khoản hoặc mật khẩu");
        return NextResponse.json({ message: 'Thiếu tài khoản hoặc mật khẩu' }, { status: 400 });
    }

    // Cấu hình HTTP Proxy
    const proxy = tunnel.httpsOverHttp({
        proxy: {
            host: '1.53.95.191',
            port: 35270,
            proxyAuth: 'baolinh1122:baolinh1122',
        }
    });

    console.log("Đã cấu hình proxy:", proxy);

    const config = {
        imap: {
            user: user,
            password: password,
            host: 'imap-mail.outlook.com',
            port: 993,
            tls: true,
            authTimeout: 5000,
            // agent: proxy, // Kích hoạt dòng này nếu muốn sử dụng proxy
        }
    };

    console.log("Đã thiết lập cấu hình IMAP:", config);

    let connection;

    try {
        console.log("Đang kết nối đến máy chủ IMAP với user:", user);
        connection = await imaps.connect(config);
        console.log("Kết nối thành công");

        console.log("Mở hộp thư 'INBOX'");
        await connection.openBox('INBOX');
        console.log("Đã mở hộp thư 'INBOX' thành công");

        const searchCriteria = [['FROM', 'noreply@telegram.org']];
        const fetchOptions = {
            bodies: [''],
            markSeen: true
        };

        console.log("Đang tìm kiếm email với tiêu chí:", searchCriteria);
        const messages = await connection.search(searchCriteria, fetchOptions);
        console.log("Tìm thấy email:", messages.length);

        let otpCode = null;

        for (const item of messages.reverse()) {
            const allParts = item.parts;

            for (const part of allParts) {
                console.log("Đang phân tích nội dung email...");
                const mail = await simpleParser(part.body);
                const body = mail.text + mail.html;
                console.log("Nội dung phần email:", body);

                const otpMatch = body && body.match(/Your code is: (\d{6})/);
                if (otpMatch) {
                    otpCode = otpMatch[1];
                    console.log("Tìm thấy OTP:", otpCode);
                    break;
                }
            }

            if (otpCode) break;
        }

        if (otpCode) {
            console.log("Gửi lại OTP cho người dùng:", otpCode);
            return NextResponse.json({ otp: otpCode }, { status: 200 });
        } else {
            console.log("Không tìm thấy OTP trong email. User:", user);
            return NextResponse.json({ otp: `000000` }, { status: 404 });
        }
    } catch (error) {
        console.error("Lỗi trong quá trình kết nối:", error);
        const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
        return NextResponse.json({ otp: `000000`, errorMessage }, { status: 500 });
    } finally {
        if (connection) {
            console.log("Đang đóng kết nối IMAP...");
            connection.end();
            console.log("Kết nối IMAP đã được đóng");
        }
    }
}
